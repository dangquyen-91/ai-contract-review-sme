import { AppError } from '../errors/AppError';
import { LegalSourceModel } from '../models/legalSource.model';
import { LegalKnowledgeChunkModel } from '../models/legalKnowledgeChunk.model';
import { CreateLegalSourceInput } from '../validations/legalSource.validation';
import {
  AnalyzedLegalText,
  analyzeLegalText,
  extractLegalText,
  ingestLegalSource,
} from './legalKnowledgeIngest.service';

const PREVIEW_TEXT_CHARS = 120;

interface LegalFile {
  buffer: Buffer;
  mimeType: string;
}

async function analyzeLegalFile(file: LegalFile, expectedArticleCount?: number): Promise<AnalyzedLegalText> {
  const fullText = await extractLegalText(file.buffer, file.mimeType);
  if (!fullText.trim()) {
    throw AppError.badRequest('No text could be extracted from the uploaded file');
  }
  const analyzed = analyzeLegalText(fullText, expectedArticleCount);
  if (analyzed.chunks.length === 0) {
    throw AppError.badRequest('The uploaded file contains no usable legal text');
  }
  return analyzed;
}

export async function previewLegalSource(file: LegalFile, expectedArticleCount?: number) {
  const { documentNumber, coverage, chunks } = await analyzeLegalFile(file, expectedArticleCount);
  return {
    documentNumber,
    coverage,
    chunks: chunks.map((c) => ({
      order: c.order,
      articleRef: c.articleRef,
      articleTitle: c.articleTitle,
      hierarchy: c.hierarchy,
      characters: c.chunkText.length,
      preview: c.chunkText.slice(0, PREVIEW_TEXT_CHARS),
    })),
  };
}

interface CreateLegalSourceParams {
  input: CreateLegalSourceInput;
  file: LegalFile;
}

async function assertCodeAvailable(code: string) {
  if (await LegalSourceModel.exists({ code })) {
    throw AppError.conflict(`A legal source with code "${code}" already exists`);
  }
}

export async function createLegalSource({ input, file }: CreateLegalSourceParams) {
  const { expectedArticleCount, ...metadata } = input;
  await assertCodeAvailable(metadata.code);
  const analyzed = await analyzeLegalFile(file, expectedArticleCount);

  try {
    const { legalSourceId } = await ingestLegalSource({ ...metadata, analyzed });
    return getLegalSource(legalSourceId);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw AppError.conflict(`A legal source with code "${metadata.code}" already exists`);
    }
    throw err;
  }
}

export async function listLegalSources() {
  const sources = await LegalSourceModel.find().sort({ createdAt: -1 });
  const chunkCounts = await LegalKnowledgeChunkModel.aggregate([
    { $group: { _id: '$legalSourceId', count: { $sum: 1 } } },
  ]);
  const countBySourceId = new Map(chunkCounts.map((c) => [c._id.toString(), c.count]));

  return sources.map((source) => ({
    ...source.toObject(),
    chunkCount: countBySourceId.get(source._id.toString()) ?? 0,
  }));
}

export async function getLegalSource(id: string) {
  const source = await LegalSourceModel.findById(id);
  if (!source) {
    throw AppError.notFound('Legal source not found');
  }
  const chunkCount = await LegalKnowledgeChunkModel.countDocuments({ legalSourceId: source._id });
  return { ...source.toObject(), chunkCount };
}

export async function deleteLegalSource(id: string) {
  const source = await LegalSourceModel.findById(id);
  if (!source) {
    throw AppError.notFound('Legal source not found');
  }
  await LegalSourceModel.deleteOne({ _id: id });
  await LegalKnowledgeChunkModel.deleteMany({ legalSourceId: id });
}
