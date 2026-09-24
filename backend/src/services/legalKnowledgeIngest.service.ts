import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import mongoose from 'mongoose';
import { LegalSourceModel, LEGAL_SOURCE_TYPES } from '../models/legalSource.model';
import {
  LegalKnowledgeChunkModel,
  EMBEDDING_DIMENSIONS,
} from '../models/legalKnowledgeChunk.model';
import { AppError } from '../errors/AppError';
import { logger } from '../config/logger';
import { embedText } from './llm.service';

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
const TXT_MIME_TYPE = 'text/plain';

export async function extractLegalText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === PDF_MIME_TYPE) return (await pdfParse(buffer)).text;
  if (mimeType === DOCX_MIME_TYPE) return (await mammoth.extractRawText({ buffer })).value;
  if (mimeType === TXT_MIME_TYPE) return buffer.toString('utf-8');
  throw AppError.badRequest(`Unsupported file type: ${mimeType}`);
}

const ARTICLE_HEADING_RE = /^\s*(Đi[eề]u\s+\d+[a-z]?)\s*[.:]?/gim;

export interface LegalChunk {
  articleRef?: string;
  chunkText: string;
}

const MAX_CHUNK_LENGTH = 3000;

export function chunkLegalText(fullText: string): LegalChunk[] {
  const headings = [...fullText.matchAll(ARTICLE_HEADING_RE)];

  if (headings.length === 0) {
    return splitLongText(fullText.trim(), undefined);
  }

  const chunks: LegalChunk[] = [];
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].index ?? 0;
    const end = i + 1 < headings.length ? (headings[i + 1].index ?? fullText.length) : fullText.length;
    const section = fullText.slice(start, end).trim();
    if (!section) continue;

    chunks.push(...splitLongText(section, headings[i][1]));
  }

  return chunks;
}

function splitLongText(text: string, articleRef: string | undefined): LegalChunk[] {
  if (text.length <= MAX_CHUNK_LENGTH) {
    return [{ articleRef, chunkText: text }];
  }

  const parts: LegalChunk[] = [];
  for (let offset = 0; offset < text.length; offset += MAX_CHUNK_LENGTH) {
    parts.push({ articleRef, chunkText: text.slice(offset, offset + MAX_CHUNK_LENGTH) });
  }
  return parts;
}

export interface IngestLegalSourceParams {
  title: string;
  sourceType: (typeof LEGAL_SOURCE_TYPES)[number];
  citationLabel: string;
  issuingBody?: string;
  effectiveDate?: Date;
  fullText: string;
}

export async function ingestLegalSource({
  title,
  sourceType,
  citationLabel,
  issuingBody,
  effectiveDate,
  fullText,
}: IngestLegalSourceParams): Promise<{ legalSourceId: string; chunkCount: number }> {
  const legalSource = await LegalSourceModel.create({
    title,
    sourceType,
    citationLabel,
    issuingBody,
    effectiveDate,
  });

  const chunks = chunkLegalText(fullText);

  let inserted = 0;
  for (const chunk of chunks) {
    const embedding = await embedText(chunk.chunkText);
    await LegalKnowledgeChunkModel.create({
      legalSourceId: legalSource._id,
      chunkText: chunk.chunkText,
      articleRef: chunk.articleRef,
      embedding,
    });
    inserted++;
  }

  return { legalSourceId: legalSource._id.toString(), chunkCount: inserted };
}
