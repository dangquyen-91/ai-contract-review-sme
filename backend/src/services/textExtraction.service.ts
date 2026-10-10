import mammoth from 'mammoth';
import { createScheduler, createWorker, Scheduler } from 'tesseract.js';
import { env } from '../config/env';
import { EXTRACTION_METHODS, EXTRACTION_STATUSES } from '../models/contractVersion.model';

export type ExtractionStatus = (typeof EXTRACTION_STATUSES)[number];
export type ExtractionMethod = (typeof EXTRACTION_METHODS)[number];

export interface ExtractionQuality {
  method: ExtractionMethod;
  pageCount?: number;
  ocrPageCount: number;
  ocrConfidence?: number;
  lowConfidence: boolean;
  truncatedAtPage?: number;
}

export interface ExtractionResult {
  status: ExtractionStatus;
  text?: string;
  error?: string;
  quality?: ExtractionQuality;
}

export interface ExtractionProgress {
  processedPages: number;
  totalPages: number;
}

type ProgressCallback = (progress: ExtractionProgress) => void;

const OCR_LANGUAGES = 'vie+eng';

const PDF_MIME_TYPE = 'application/pdf';
const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const OCR_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg']);

const MIN_TEXT_LAYER_CHARS_PER_PAGE = 30;
const MAX_PDF_PAGES = 100;
const OCR_RENDER_SCALE = 2.5;
const LOW_OCR_CONFIDENCE = 70;
const MAX_PENDING_OCR_PAGES_PER_WORKER = 2;
const OCR_RECYCLE_AFTER_PAGES = 100;

export function normalizeExtractedText(text: string): string {
  return text
    .normalize('NFC')
    .replaceAll('\u0000', '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u00AD\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

let ocrScheduler: Promise<Scheduler> | null = null;

function getOcrScheduler(): Promise<Scheduler> {
  if (!ocrScheduler) {
    ocrScheduler = (async () => {
      const created = await Promise.allSettled(
        Array.from({ length: env.OCR_WORKERS }, () => createWorker(OCR_LANGUAGES)),
      );
      const workers = created.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
      const failure = created.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failure) {
        await Promise.all(workers.map((w) => w.terminate().catch(() => undefined)));
        throw failure.reason;
      }
      const scheduler = createScheduler();
      workers.forEach((w) => scheduler.addWorker(w));
      return scheduler;
    })().catch((err) => {
      ocrScheduler = null;
      throw err;
    });
  }
  return ocrScheduler;
}

let ocrPagesSinceStart = 0;
let activeOcrPages = 0;

export async function terminateOcr(): Promise<void> {
  if (!ocrScheduler) return;
  const pending = ocrScheduler;
  ocrScheduler = null;
  ocrPagesSinceStart = 0;
  await (await pending).terminate();
}

export async function recycleOcrIfNeeded(): Promise<void> {
  if (ocrPagesSinceStart < OCR_RECYCLE_AFTER_PAGES || activeOcrPages > 0) return;
  await terminateOcr();
}

interface OcrPage {
  text: string;
  confidence: number;
}

async function ocrImage(image: Buffer): Promise<OcrPage> {
  activeOcrPages++;
  try {
    const scheduler = await getOcrScheduler();
    const { data } = await scheduler.addJob('recognize', image);
    ocrPagesSinceStart++;
    return { text: normalizeExtractedText(data.text), confidence: data.confidence };
  } finally {
    activeOcrPages--;
  }
}

function summarizeOcr(pages: OcrPage[]) {
  const chars = pages.reduce((sum, p) => sum + p.text.length, 0);
  if (pages.length === 0 || chars === 0) {
    return { ocrPageCount: pages.length, lowConfidence: pages.length > 0 };
  }
  const confidence = pages.reduce((sum, p) => sum + p.confidence * p.text.length, 0) / chars;
  return {
    ocrPageCount: pages.length,
    ocrConfidence: Math.round(confidence),
    lowConfidence: confidence < LOW_OCR_CONFIDENCE,
  };
}

const yieldToEventLoop = () => new Promise<void>((resolve) => setImmediate(resolve));

async function extractFromPdf(
  buffer: Buffer,
  onProgress?: ProgressCallback,
): Promise<{ text: string; quality: ExtractionQuality }> {
  const mupdf = await import('mupdf');
  const doc = mupdf.Document.openDocument(buffer, PDF_MIME_TYPE);
  try {
    const pageCount = doc.countPages();
    const processedPages = Math.min(pageCount, MAX_PDF_PAGES);
    const pageTexts: string[] = new Array(processedPages).fill('');
    const ocrPages: OcrPage[] = [];
    const inFlight = new Set<Promise<void>>();
    const maxInFlight = env.OCR_WORKERS * MAX_PENDING_OCR_PAGES_PER_WORKER;
    let finishedPages = 0;
    const pageFinished = () => {
      finishedPages++;
      onProgress?.({ processedPages: finishedPages, totalPages: processedPages });
    };

    for (let i = 0; i < processedPages; i++) {
      const page = doc.loadPage(i);
      try {
        const layerText = normalizeExtractedText(page.toStructuredText('preserve-whitespace').asText());
        if (layerText.length >= MIN_TEXT_LAYER_CHARS_PER_PAGE) {
          pageTexts[i] = layerText;
          pageFinished();
        } else {
          const pixmap = page.toPixmap(
            mupdf.Matrix.scale(OCR_RENDER_SCALE, OCR_RENDER_SCALE),
            mupdf.ColorSpace.DeviceRGB,
            false,
            true,
          );
          const png = Buffer.from(pixmap.asPNG());
          pixmap.destroy();
          const job = ocrImage(png).then((result) => {
            pageTexts[i] = result.text;
            ocrPages.push(result);
            pageFinished();
          });
          const tracked = job.finally(() => inFlight.delete(tracked));
          inFlight.add(tracked);
          if (inFlight.size >= maxInFlight) await Promise.race(inFlight);
        }
      } finally {
        page.destroy();
      }
      await yieldToEventLoop();
    }
    await Promise.all(inFlight);

    const ocr = summarizeOcr(ocrPages);
    const method: ExtractionMethod =
      ocr.ocrPageCount === 0 ? 'text_layer' : ocr.ocrPageCount === processedPages ? 'ocr' : 'mixed';
    return {
      text: pageTexts.filter(Boolean).join('\n\n'),
      quality: {
        method,
        pageCount,
        ...ocr,
        ...(pageCount > MAX_PDF_PAGES ? { truncatedAtPage: MAX_PDF_PAGES } : {}),
      },
    };
  } finally {
    doc.destroy();
  }
}

async function extractFromDocx(buffer: Buffer): Promise<{ text: string; quality: ExtractionQuality }> {
  const { value } = await mammoth.extractRawText({ buffer });
  return {
    text: normalizeExtractedText(value),
    quality: { method: 'docx', ocrPageCount: 0, lowConfidence: false },
  };
}

async function extractFromImage(
  buffer: Buffer,
  onProgress?: ProgressCallback,
): Promise<{ text: string; quality: ExtractionQuality }> {
  const page = await ocrImage(buffer);
  onProgress?.({ processedPages: 1, totalPages: 1 });
  return {
    text: page.text,
    quality: { method: 'ocr', pageCount: 1, ...summarizeOcr([page]) },
  };
}

export async function extractContractText(
  buffer: Buffer,
  mimeType: string,
  onProgress?: ProgressCallback,
): Promise<ExtractionResult> {
  try {
    let extracted: { text: string; quality: ExtractionQuality };
    if (mimeType === PDF_MIME_TYPE) {
      extracted = await extractFromPdf(buffer, onProgress);
    } else if (mimeType === DOCX_MIME_TYPE) {
      extracted = await extractFromDocx(buffer);
    } else if (OCR_IMAGE_MIME_TYPES.has(mimeType)) {
      extracted = await extractFromImage(buffer, onProgress);
    } else {
      return { status: 'unsupported', error: `No text extraction available for ${mimeType}` };
    }

    if (!extracted.text) {
      return {
        status: 'failed',
        error: 'No readable text was found in the file',
        quality: extracted.quality,
      };
    }
    return { status: 'completed', text: extracted.text, quality: extracted.quality };
  } catch (err) {
    return { status: 'failed', error: err instanceof Error ? err.message : 'Extraction failed' };
  }
}
