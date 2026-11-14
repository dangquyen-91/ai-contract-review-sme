import mammoth from 'mammoth';
import { validateUploadContent } from '../../utils/uploadContent';
import pdfParse from 'pdf-parse';
import WordExtractor from 'word-extractor';
import mongoose from 'mongoose';
import {
  LegalKnowledgeChunkModel,
  EMBEDDING_DIMENSIONS,
} from '../../models/legalKnowledgeChunk.model';
import { AppError } from '../../errors/AppError';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { normalizeExtractedText } from '../contract/textExtraction.service';
import {
  buildLegalCoverage,
  LegalArticleKey,
  LegalChunkDraft,
  LegalCoverageReport,
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

async function readLegalText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === PDF_MIME_TYPE) return (await pdfParse(buffer)).text;
  if (mimeType === DOCX_MIME_TYPE) return (await mammoth.extractRawText({ buffer })).value;
  if (mimeType === DOC_MIME_TYPE) return (await new WordExtractor().extract(buffer)).getBody();
  if (mimeType === TXT_MIME_TYPE) return buffer.toString('utf-8');
  throw AppError.badRequest(`Unsupported file type: ${mimeType}`);
}

export async function extractLegalText(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    await validateUploadContent(buffer, mimeType);
    return normalizeExtractedText(await readLegalText(buffer, mimeType));
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
}

export function analyzeLegalText(fullText: string, expectedArticleCount?: number): AnalyzedLegalText {
  const parsed = parseLegalDocument(fullText);
  return {
    documentNumber: parsed.documentNumber,
    articles: parsed.articles,
    headingCount: parsed.headingCount,
    chunks: parsed.chunks,
    coverage: buildLegalCoverage({
      articles: parsed.articles,
      headingCount: parsed.headingCount,
      chunkCount: parsed.chunks.length,
      expectedArticleCount,
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
