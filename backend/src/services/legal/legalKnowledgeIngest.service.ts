import mammoth from 'mammoth';
import { validateUploadContent } from '../../utils/uploadContent';
import WordExtractor from 'word-extractor';
import mongoose from 'mongoose';
import {
  LegalKnowledgeChunkModel,
  EMBEDDING_DIMENSIONS,
} from '../../models/legalKnowledgeChunk.model';
import { AppError } from '../../errors/AppError';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import {
  MAX_PENDING_OCR_PAGES_PER_WORKER,
  MIN_TEXT_LAYER_CHARS_PER_PAGE,
  normalizeExtractedText,
  OCR_RENDER_SCALE,
  ocrImage,
  OcrPage,
  recycleOcrIfNeeded,
  summarizeOcr,
} from '../contract/textExtraction.service';
import {
  buildLegalCoverage,
  CleanedPdfText,
  cleanPdfPages,
  cleanupWarnings,
  extractionWarnings,
  LegalArticleKey,
  LegalChunkDraft,
  LegalCoverageReport,
  LegalExtractionQuality,
  LegalTextCleanup,
  parseLegalDocument,
} from './legalDocumentParser.service';

export const LEGAL_CHUNK_VECTOR_INDEX_NAME = 'legal_chunk_vector_index';

export const LEGAL_CHUNK_TEXT_INDEX_NAME = 'legal_chunk_text_index';

const LEGAL_TEXT_INDEX_DEFINITION = {
  mappings: {
    dynamic: false,
    fields: {
      chunkText: { type: 'string', analyzer: 'lucene.standard' },
      articleTitle: { type: 'string', analyzer: 'lucene.standard' },
      legalSourceId: { type: 'objectId' },
    },
  },
};

export async function ensureLegalTextIndex(): Promise<void> {
  try {
    const collection = mongoose.connection.collection(LegalKnowledgeChunkModel.collection.name);
    const [existing] = await collection.listSearchIndexes(LEGAL_CHUNK_TEXT_INDEX_NAME).toArray();
    if (existing) return;
    await collection.createSearchIndex({
      name: LEGAL_CHUNK_TEXT_INDEX_NAME,
      type: 'search',
      definition: LEGAL_TEXT_INDEX_DEFINITION,
    });
    logger.info(`Created Atlas Search index "${LEGAL_CHUNK_TEXT_INDEX_NAME}"`);
  } catch (err) {
    logger.warn(
      'Could not ensure legal chunk text index (requires a MongoDB Atlas cluster with Search enabled)',
      err,
    );
  }
}

export const LEGAL_EMBEDDING_MODEL = `${env.GEMINI_EMBEDDING_MODEL}@${EMBEDDING_DIMENSIONS}`;

export const CURRENT_EMBEDDING = { embeddingModel: LEGAL_EMBEDDING_MODEL };

export const NEEDS_EMBEDDING = {
  $or: [{ embedding: { $exists: false } }, { embeddingModel: { $ne: LEGAL_EMBEDDING_MODEL } }],
};

export const OUTDATED_EMBEDDING = { embedding: { $exists: true }, embeddingModel: { $ne: LEGAL_EMBEDDING_MODEL } };

const LEGAL_VECTOR_FILTER_PATHS = ['legalSourceId', 'embeddingModel'];

const LEGAL_VECTOR_INDEX_DEFINITION = {
  fields: [
    {
      type: 'vector',
      path: 'embedding',
      numDimensions: EMBEDDING_DIMENSIONS,
      similarity: 'cosine',
    },
    ...LEGAL_VECTOR_FILTER_PATHS.map((path) => ({ type: 'filter', path })),
  ],
};

interface VectorIndexField {
  type?: string;
  path?: string;
  numDimensions?: number;
}

function isCurrentVectorIndex(fields: VectorIndexField[]): boolean {
  const vector = fields.find((f) => f.type === 'vector' && f.path === 'embedding');
  return (
    vector?.numDimensions === EMBEDDING_DIMENSIONS &&
    LEGAL_VECTOR_FILTER_PATHS.every((path) => fields.some((f) => f.type === 'filter' && f.path === path))
  );
}

export async function ensureLegalVectorIndex(): Promise<void> {
  try {
    const collection = mongoose.connection.collection(LegalKnowledgeChunkModel.collection.name);
    const [existing] = await collection.listSearchIndexes(LEGAL_CHUNK_VECTOR_INDEX_NAME).toArray();
    if (existing) {
      const { latestDefinition } = existing as { latestDefinition?: { fields?: VectorIndexField[] } };
      if (isCurrentVectorIndex(latestDefinition?.fields ?? [])) return;
      await collection.updateSearchIndex(LEGAL_CHUNK_VECTOR_INDEX_NAME, LEGAL_VECTOR_INDEX_DEFINITION);
      logger.info(`Updated Atlas Vector Search index "${LEGAL_CHUNK_VECTOR_INDEX_NAME}" to the current dimensions and filters`);
      return;
    }

    await collection.createSearchIndex({
      name: LEGAL_CHUNK_VECTOR_INDEX_NAME,
      type: 'vectorSearch',
      definition: LEGAL_VECTOR_INDEX_DEFINITION,
    });
    logger.info(`Created Atlas Vector Search index "${LEGAL_CHUNK_VECTOR_INDEX_NAME}"`);
  } catch (err) {
    logger.warn(
      'Could not ensure legal chunk vector index (requires a MongoDB Atlas cluster with Search enabled)',
      err,
    );
  }
}

export async function reconcileLegalEmbeddingModel(): Promise<void> {
  const labelled = await LegalKnowledgeChunkModel.updateMany(
    { embedding: { $exists: true }, embeddingModel: { $exists: false } },
    { $set: CURRENT_EMBEDDING },
  );
  if (labelled.modifiedCount > 0) {
    logger.info('Labelled legal chunk embeddings stored before the model was recorded', {
      chunks: labelled.modifiedCount,
      embeddingModel: LEGAL_EMBEDDING_MODEL,
    });
  }

  const outdated = await LegalKnowledgeChunkModel.aggregate<{ _id: unknown; chunks: number; models: string[] }>([
    { $match: OUTDATED_EMBEDDING },
    { $group: { _id: '$legalSourceId', chunks: { $sum: 1 }, models: { $addToSet: '$embeddingModel' } } },
  ]);
  if (outdated.length > 0) {
    logger.warn('Some legal chunks were embedded with another model and are left out of vector search until re-embedded', {
      embeddingModel: LEGAL_EMBEDDING_MODEL,
      sources: outdated.map((s) => ({ legalSourceId: String(s._id), chunks: s.chunks, models: s.models })),
      fix: 'POST /api/v1/kb/legal-sources/{id}/resume',
    });
  }
}

const PDF_MIME_TYPE = 'application/pdf';
const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOC_MIME_TYPE = 'application/msword';
const TXT_MIME_TYPE = 'text/plain';

const MAX_LEGAL_PDF_PAGES = 1500;
export const MAX_LEGAL_OCR_PAGES = 40;

async function readPdf(buffer: Buffer): Promise<{ pages: string[]; extraction: LegalExtractionQuality }> {
  const mupdf = await import('mupdf');
  const doc = mupdf.Document.openDocument(buffer, PDF_MIME_TYPE);
  try {
    const pageCount = doc.countPages();
    if (pageCount > MAX_LEGAL_PDF_PAGES) {
      throw AppError.badRequest(`The PDF has ${pageCount} pages; split it into files of at most ${MAX_LEGAL_PDF_PAGES} pages`);
    }
    const pages: string[] = new Array(pageCount).fill('');
    const scanned: number[] = [];
    for (let i = 0; i < pageCount; i++) {
      const page = doc.loadPage(i);
      try {
        const text = normalizeExtractedText(page.toStructuredText('preserve-whitespace').asText());
        if (text.length >= MIN_TEXT_LAYER_CHARS_PER_PAGE) pages[i] = text;
        else scanned.push(i);
      } finally {
        page.destroy();
      }
    }
    if (scanned.length > MAX_LEGAL_OCR_PAGES) {
      throw AppError.badRequest(
        `${scanned.length} pages have no text layer and would need OCR (at most ${MAX_LEGAL_OCR_PAGES} per file); upload a text PDF or a DOCX from Công báo or vbpl.vn instead`,
        'LEGAL_OCR_LIMIT',
      );
    }

    const ocrPages: OcrPage[] = [];
    const inFlight = new Set<Promise<void>>();
    const maxInFlight = env.OCR_WORKERS * MAX_PENDING_OCR_PAGES_PER_WORKER;
    try {
      for (const i of scanned) {
        const page = doc.loadPage(i);
        let png: Buffer;
        try {
          const pixmap = page.toPixmap(
            mupdf.Matrix.scale(OCR_RENDER_SCALE, OCR_RENDER_SCALE),
            mupdf.ColorSpace.DeviceRGB,
            false,
            true,
          );
          png = Buffer.from(pixmap.asPNG());
          pixmap.destroy();
        } finally {
          page.destroy();
        }
        const job = ocrImage(png).then((result) => {
          pages[i] = result.text;
          ocrPages.push(result);
        });
        const tracked = job.finally(() => inFlight.delete(tracked));
        inFlight.add(tracked);
        if (inFlight.size >= maxInFlight) await Promise.race(inFlight);
      }
      await Promise.all(inFlight);
    } finally {
      await recycleOcrIfNeeded().catch(() => undefined);
    }

    const ocr = summarizeOcr(ocrPages);
    const method = ocr.ocrPageCount === 0 ? 'text_layer' : ocr.ocrPageCount === pageCount ? 'ocr' : 'mixed';
    return { pages, extraction: { method, pageCount, ...ocr } };
  } finally {
    doc.destroy();
  }
}

export interface ExtractedLegalText extends CleanedPdfText {
  extraction: LegalExtractionQuality;
}

async function readLegalText(buffer: Buffer, mimeType: string): Promise<ExtractedLegalText> {
  const plain = (text: string, method: 'docx' | 'doc' | 'txt') => ({
    text,
    pageFurnitureLines: 0,
    footnoteLines: 0,
    extraction: { method, ocrPageCount: 0, lowConfidence: false },
  });
  if (mimeType === PDF_MIME_TYPE) {
    const { pages, extraction } = await readPdf(buffer);
    return { ...cleanPdfPages(pages), extraction };
  }
  if (mimeType === DOCX_MIME_TYPE) return plain((await mammoth.extractRawText({ buffer })).value, 'docx');
  if (mimeType === DOC_MIME_TYPE) return plain((await new WordExtractor().extract(buffer)).getBody(), 'doc');
  if (mimeType === TXT_MIME_TYPE) return plain(buffer.toString('utf-8'), 'txt');
  throw AppError.badRequest(`Unsupported file type: ${mimeType}`);
}

export async function extractLegalText(buffer: Buffer, mimeType: string): Promise<ExtractedLegalText> {
  try {
    await validateUploadContent(buffer, mimeType);
    const extracted = await readLegalText(buffer, mimeType);
    return { ...extracted, text: normalizeExtractedText(extracted.text) };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.badRequest('The legal document could not be read; check that the file is not corrupted');
  }
}

export interface AnalyzedLegalText {
  documentNumber?: string;
  articles: LegalArticleKey[];
  headingCount: number;
  chunks: LegalChunkDraft[];
  coverage: LegalCoverageReport;
  cleanup: LegalTextCleanup;
  extraction: LegalExtractionQuality;
}

export function analyzeLegalText(extracted: ExtractedLegalText, expectedArticleCount?: number): AnalyzedLegalText {
  const parsed = parseLegalDocument(extracted.text);
  const cleanup: LegalTextCleanup = {
    pageFurnitureLines: extracted.pageFurnitureLines,
    footnoteLines: extracted.footnoteLines + parsed.footnoteLines,
    droppedTailLines: parsed.endOfText?.droppedLines ?? 0,
    ...(parsed.endOfText ? { stoppedAt: parsed.endOfText.marker, stoppedAtKind: parsed.endOfText.kind } : {}),
  };
  return {
    documentNumber: parsed.documentNumber,
    articles: parsed.articles,
    headingCount: parsed.headingCount,
    chunks: parsed.chunks,
    cleanup,
    extraction: extracted.extraction,
    coverage: buildLegalCoverage({
      articles: parsed.articles,
      headingCount: parsed.headingCount,
      chunkCount: parsed.chunks.length,
      expectedArticleCount,
      notes: [...extractionWarnings(extracted.extraction), ...cleanupWarnings(cleanup)],
    }),
  };
}

interface EmbeddableChunk {
  chunkText: string;
  hierarchy?: { title?: string | null }[] | null;
}

export function embeddingInputOf(citationLabel: string, chunk: EmbeddableChunk): string {
  const context = (chunk.hierarchy ?? [])
    .map((h) => h.title)
    .filter(Boolean)
    .join(' > ');
  return [citationLabel, context, chunk.chunkText].filter(Boolean).join('\n');
}
