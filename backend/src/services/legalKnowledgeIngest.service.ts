import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import WordExtractor from 'word-extractor';
import mongoose from 'mongoose';
import { LegalSourceModel, LEGAL_SOURCE_STATUSES, LEGAL_SOURCE_TYPES } from '../models/legalSource.model';
import {
  LegalKnowledgeChunkModel,
  EMBEDDING_DIMENSIONS,
} from '../models/legalKnowledgeChunk.model';
import { AppError } from '../errors/AppError';
import { logger } from '../config/logger';
import { embedTexts } from './llm.service';
import { normalizeExtractedText } from './textExtraction.service';
import {
  buildLegalCoverage,
  LegalChunkDraft,
  LegalCoverageReport,
  parseLegalDocument,
} from './legalDocumentParser.service';

export const LEGAL_CHUNK_VECTOR_INDEX_NAME = 'legal_chunk_vector_index';

export async function ensureLegalVectorIndex(): Promise<void> {
  try {
    const collection = mongoose.connection.collection(LegalKnowledgeChunkModel.collection.name);
    const existing = await collection.listSearchIndexes(LEGAL_CHUNK_VECTOR_INDEX_NAME).toArray();
    if (existing.length > 0) return;

    await collection.createSearchIndex({
      name: LEGAL_CHUNK_VECTOR_INDEX_NAME,
      type: 'vectorSearch',
      definition: {
        fields: [
          {
            type: 'vector',
            path: 'embedding',
            numDimensions: EMBEDDING_DIMENSIONS,
            similarity: 'cosine',
          },
        ],
      },
    });
    logger.info(`Created Atlas Vector Search index "${LEGAL_CHUNK_VECTOR_INDEX_NAME}"`);
  } catch (err) {
    logger.warn(
      'Could not ensure legal chunk vector index (requires a MongoDB Atlas cluster with Search enabled)',
      err,
    );
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
    return normalizeExtractedText(await readLegalText(buffer, mimeType));
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.badRequest('The legal document could not be read; check that the file is not corrupted');
  }
}

export interface AnalyzedLegalText {
  documentNumber?: string;
  chunks: LegalChunkDraft[];
  coverage: LegalCoverageReport;
}

export function analyzeLegalText(fullText: string, expectedArticleCount?: number): AnalyzedLegalText {
  const parsed = parseLegalDocument(fullText);
  return {
    documentNumber: parsed.documentNumber,
    chunks: parsed.chunks,
    coverage: buildLegalCoverage({
      articles: parsed.articles,
      headingCount: parsed.headingCount,
      chunkCount: parsed.chunks.length,
      expectedArticleCount,
    }),
  };
}

export function embeddingInputOf(citationLabel: string, chunk: LegalChunkDraft): string {
  const context = (chunk.hierarchy ?? [])
    .map((h) => h.title)
    .filter(Boolean)
    .join(' > ');
  return [citationLabel, context, chunk.chunkText].filter(Boolean).join('\n');
}

export interface IngestLegalSourceParams {
  code: string;
  title: string;
  documentNumber?: string;
  sourceType: (typeof LEGAL_SOURCE_TYPES)[number];
  status?: (typeof LEGAL_SOURCE_STATUSES)[number];
  citationLabel: string;
  issuingBody?: string;
  issuedDate?: Date;
  effectiveDate?: Date;
  expiryDate?: Date;
  analyzed: AnalyzedLegalText;
}

export async function ingestLegalSource({
  analyzed,
  documentNumber,
  ...metadata
}: IngestLegalSourceParams): Promise<{ legalSourceId: string; chunkCount: number }> {
  const { chunks, coverage } = analyzed;
  const embeddings = await embedTexts(
    chunks.map((c) => embeddingInputOf(metadata.citationLabel, c)),
    { taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: EMBEDDING_DIMENSIONS },
  );

  const legalSource = await LegalSourceModel.create({
    ...metadata,
    documentNumber: documentNumber ?? analyzed.documentNumber,
    coverage,
  });

  try {
    await LegalKnowledgeChunkModel.insertMany(
      chunks.map((chunk, i) => ({ ...chunk, legalSourceId: legalSource._id, embedding: embeddings[i] })),
    );
  } catch (err) {
    await LegalKnowledgeChunkModel.deleteMany({ legalSourceId: legalSource._id });
    await LegalSourceModel.deleteOne({ _id: legalSource._id });
    throw err;
  }

  return { legalSourceId: legalSource._id.toString(), chunkCount: chunks.length };
}
