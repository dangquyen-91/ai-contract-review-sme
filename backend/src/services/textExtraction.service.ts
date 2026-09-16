import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { EXTRACTION_STATUSES } from '../models/contract.model';

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

async function extractFromPdf(buffer: Buffer): Promise<string> {
  const { text } = await pdfParse(buffer);
  return text.trim();
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer });
  return value.trim();
}

async function extractFromImage(buffer: Buffer): Promise<string> {
  const worker = await createWorker(OCR_LANGUAGES);
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return text.trim();
  } finally {
    await worker.terminate();
  }
}

export async function extractContractText(
  buffer: Buffer,
  mimeType: string,
): Promise<ExtractionResult> {
  try {
    if (mimeType === PDF_MIME_TYPE) {
      return { status: 'completed', text: await extractFromPdf(buffer) };
    }

    if (mimeType === DOCX_MIME_TYPE) {
      return { status: 'completed', text: await extractFromDocx(buffer) };
    }

    if (OCR_IMAGE_MIME_TYPES.has(mimeType)) {
      return { status: 'completed', text: await extractFromImage(buffer) };
    }

    return { status: 'unsupported', error: `No text extraction available for ${mimeType}` };
  } catch (err) {
    return { status: 'failed', error: err instanceof Error ? err.message : 'Extraction failed' };
  }
}
