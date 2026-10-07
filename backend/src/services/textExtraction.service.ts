import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { createWorker, Worker } from 'tesseract.js';
import { EXTRACTION_STATUSES } from '../models/contractVersion.model';

export type ExtractionStatus = (typeof EXTRACTION_STATUSES)[number];

export interface ExtractionResult {
  status: ExtractionStatus;
  text?: string;
  error?: string;
}

const OCR_LANGUAGES = 'vie+eng';

const PDF_MIME_TYPE = 'application/pdf';
const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const OCR_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg']);

const MIN_PDF_CHARS_PER_PAGE = 30;
const MAX_OCR_PAGES = 20;
const OCR_RENDER_SCALE = 2.5; // ~180 dpi

async function renderPdfPagesToPng(buffer: Buffer): Promise<Buffer[]> {
  const mupdf = await import('mupdf');
  const doc = mupdf.Document.openDocument(buffer, 'application/pdf');
  const pageCount = Math.min(doc.countPages(), MAX_OCR_PAGES);
  const pages: Buffer[] = [];
  for (let i = 0; i < pageCount; i++) {
    const pixmap = doc
      .loadPage(i)
      .toPixmap(
        mupdf.Matrix.scale(OCR_RENDER_SCALE, OCR_RENDER_SCALE),
        mupdf.ColorSpace.DeviceRGB,
        false,
        true,
      );
    pages.push(Buffer.from(pixmap.asPNG()));
  }
  return pages;
}

async function extractFromPdf(buffer: Buffer): Promise<string> {
  const { text, numpages } = await pdfParse(buffer);
  const trimmed = text.trim();
  if (trimmed.length >= MIN_PDF_CHARS_PER_PAGE * Math.max(numpages, 1)) return trimmed;

  return ocrImages(await renderPdfPagesToPng(buffer));
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer });
  return value.trim();
}

let ocrWorker: Promise<Worker> | null = null;

function getOcrWorker(): Promise<Worker> {
  if (!ocrWorker) {
    ocrWorker = createWorker(OCR_LANGUAGES).catch((err) => {
      ocrWorker = null;
      throw err;
    });
  }
  return ocrWorker;
}

export async function terminateOcrWorker(): Promise<void> {
  if (!ocrWorker) return;
  const pending = ocrWorker;
  ocrWorker = null;
  await (await pending).terminate();
}

async function ocrImages(images: Buffer[]): Promise<string> {
  const worker = await getOcrWorker();
  const texts: string[] = [];
  for (const image of images) {
    const {
      data: { text },
    } = await worker.recognize(image);
    texts.push(text.trim());
  }
  return texts.filter(Boolean).join('\n\n');
}

async function extractFromImage(buffer: Buffer): Promise<string> {
  return ocrImages([buffer]);
}

export async function extractContractText(
  buffer: Buffer,
  mimeType: string,
): Promise<ExtractionResult> {
  try {
    let text: string;
    if (mimeType === PDF_MIME_TYPE) {
      text = await extractFromPdf(buffer);
    } else if (mimeType === DOCX_MIME_TYPE) {
      text = await extractFromDocx(buffer);
    } else if (OCR_IMAGE_MIME_TYPES.has(mimeType)) {
      text = await extractFromImage(buffer);
    } else {
      return { status: 'unsupported', error: `No text extraction available for ${mimeType}` };
    }

    if (!text) {
      return { status: 'failed', error: 'No readable text was found in the file' };
    }
    return { status: 'completed', text };
  } catch (err) {
    return { status: 'failed', error: err instanceof Error ? err.message : 'Extraction failed' };
  }
}
