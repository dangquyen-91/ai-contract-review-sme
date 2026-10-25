import { Types } from 'mongoose';
import { AppError } from '../../errors/AppError';
import { LegalSourceModel } from '../../models/legalSource.model';
import { LegalKnowledgeChunkModel } from '../../models/legalKnowledgeChunk.model';
import { CreateLegalSourceInput } from '../../validations/legalSource.validation';
import { AnalyzedLegalText, analyzeLegalText, extractLegalText } from './legalKnowledgeIngest.service';
import { buildLegalCoverage, LegalChunkDraft } from './legalDocumentParser.service';
import { isLegalIngestionJobAlive, queueLegalIngestion } from './legalIngestionWorker.service';
import { isLlmConfigured } from '../ai/llm.service';
import { logger } from '../../config/logger';
import { ContractProfileModel } from '../../models/contractProfile.model';
import { isCatalogLegalSourceCode, LEGAL_SOURCE_CATALOG, LegalSourceCode } from './legalSourceCatalog.data';
import { LEGAL_RULES } from './legalRules.data';

const PREVIEW_TEXT_CHARS = 120;

interface LegalFile {
  buffer: Buffer;
  mimeType: string;
  name?: string;
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

function assertLlmConfigured() {
  if (!isLlmConfigured) throw AppError.badRequest('LLM is not configured. Set GEMINI_API_KEY.');
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

function partOf(file: LegalFile, chunks: LegalChunkDraft[], skippedArticles: string[] = []) {
  const numbers = chunks.flatMap((c) => (c.articleNumber === undefined ? [] : [c.articleNumber]));
  return {
    fileName: file.name,
    articleFrom: numbers.length ? Math.min(...numbers) : undefined,
    articleTo: numbers.length ? Math.max(...numbers) : undefined,
    chunkCount: chunks.length,
    skippedArticles,
    uploadedAt: new Date(),
  };
}

const chunkDocs = (legalSourceId: Types.ObjectId, chunks: LegalChunkDraft[], firstOrder = 0) =>
  chunks.map((chunk, i) => ({ ...chunk, order: firstOrder + i, legalSourceId }));

async function startIngestion(legalSourceId: string) {
  try {
    await queueLegalIngestion(legalSourceId);
  } catch (err) {
    await LegalSourceModel.updateOne(
      { _id: legalSourceId },
      { $set: { 'ingestion.status': 'failed', 'ingestion.error': 'Could not queue the embedding job; resume it later' } },
    );
    throw err;
  }
}

interface CreateLegalSourceParams {
  input: CreateLegalSourceInput;
  file: LegalFile;
}

const duplicateCode = (code: string) => AppError.conflict(`A legal source with code "${code}" already exists`);

export async function createLegalSource({ input, file }: CreateLegalSourceParams) {
  const { expectedArticleCount, documentNumber, ...metadata } = input;
  assertLlmConfigured();
  if (await LegalSourceModel.exists({ code: metadata.code })) throw duplicateCode(metadata.code);
  const analyzed = await analyzeLegalFile(file, expectedArticleCount);

  let source;
  try {
    source = await LegalSourceModel.create({
      ...metadata,
      documentNumber: documentNumber ?? analyzed.documentNumber,
      coverage: analyzed.coverage,
      ingestion: { status: 'queued', totalChunks: analyzed.chunks.length, embeddedChunks: 0 },
      parts: [partOf(file, analyzed.chunks)],
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) throw duplicateCode(metadata.code);
    throw err;
  }

  try {
    await LegalKnowledgeChunkModel.insertMany(chunkDocs(source._id, analyzed.chunks));
    await queueLegalIngestion(source.id);
  } catch (err) {
    await LegalKnowledgeChunkModel.deleteMany({ legalSourceId: source._id });
    await LegalSourceModel.deleteOne({ _id: source._id });
    throw err;
  }
  return getLegalSource(source.id);
}

async function coverageOfStoredChunks(legalSourceId: Types.ObjectId, headingCount: number, expectedArticleCount?: number) {
  const [articles, chunkCount] = await Promise.all([
    LegalKnowledgeChunkModel.aggregate<{ _id: string; number: number }>([
      { $match: { legalSourceId, articleKey: { $exists: true } } },
      { $group: { _id: '$articleKey', number: { $first: '$articleNumber' } } },
    ]),
    LegalKnowledgeChunkModel.countDocuments({ legalSourceId }),
  ]);
  return buildLegalCoverage({
    articles: articles.map((a) => ({ number: a.number, suffix: a._id.slice(String(a.number).length) })),
    headingCount,
    chunkCount,
    expectedArticleCount,
  });
}

export async function appendLegalSourcePart(id: string, file: LegalFile, expectedArticleCount?: number) {
  assertLlmConfigured();
  const source = await LegalSourceModel.findById(id);
  if (!source) throw AppError.notFound('Legal source not found');
  const analyzed = await analyzeLegalFile(file);

  const existingKeys = new Set(
    (await LegalKnowledgeChunkModel.distinct('articleKey', { legalSourceId: source._id })).map(String),
  );
  const fresh = analyzed.chunks.filter((c) => !c.articleKey || !existingKeys.has(c.articleKey));
  const skippedArticles = [
    ...new Set(analyzed.chunks.filter((c) => c.articleKey && existingKeys.has(c.articleKey)).map((c) => c.articleKey!)),
  ];
  if (fresh.length === 0) {
    throw AppError.conflict('Every article in this file is already part of the legal source');
  }

  const last = await LegalKnowledgeChunkModel.findOne({ legalSourceId: source._id }).sort({ order: -1 }).select('order');
  try {
    await LegalKnowledgeChunkModel.insertMany(chunkDocs(source._id, fresh, (last?.order ?? -1) + 1));
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw AppError.conflict('Another part of this legal source is being uploaded; try again');
    }
    throw err;
  }

  const expected = expectedArticleCount ?? source.coverage?.expectedArticleCount ?? undefined;
  const coverage = await coverageOfStoredChunks(
    source._id,
    (source.coverage?.headingCount ?? 0) + analyzed.headingCount,
    expected,
  );
  const totalChunks = coverage.chunkCount;
  await LegalSourceModel.updateOne(
    { _id: source._id },
    {
      $set: {
        coverage,
        'ingestion.totalChunks': totalChunks,
        ...(source.documentNumber || !analyzed.documentNumber ? {} : { documentNumber: analyzed.documentNumber }),
        ...(source.ingestion ? {} : { 'ingestion.embeddedChunks': totalChunks - fresh.length }),
      },
      $push: { parts: partOf(file, fresh, skippedArticles) },
    },
  );
  await startIngestion(source.id);
  return getLegalSource(source.id);
}

export async function resumeLegalIngestion(id: string) {
  assertLlmConfigured();
  const source = await LegalSourceModel.findById(id);
  if (!source) throw AppError.notFound('Legal source not found');

  const pending = await LegalKnowledgeChunkModel.countDocuments({
    legalSourceId: source._id,
    embedding: { $exists: false },
  });
  if (pending === 0) {
    if (source.ingestion?.status !== 'completed') {
      const total = await LegalKnowledgeChunkModel.countDocuments({ legalSourceId: source._id });
      await LegalSourceModel.updateOne(
        { _id: source._id },
        {
          $set: { 'ingestion.status': 'completed', 'ingestion.totalChunks': total, 'ingestion.embeddedChunks': total, 'ingestion.finishedAt': new Date() },
          $unset: { 'ingestion.error': '', 'ingestion.resumeAt': '', 'ingestion.jobId': '' },
        },
      );
    }
    throw AppError.conflict('Every chunk of this legal source is already embedded');
  }

  const status = source.ingestion?.status;
  if ((status === 'queued' || status === 'running') && (await isLegalIngestionJobAlive(source.ingestion?.jobId))) {
    throw AppError.conflict('This legal source is already being embedded');
  }
  if (!source.ingestion) {
    const total = await LegalKnowledgeChunkModel.countDocuments({ legalSourceId: source._id });
    await LegalSourceModel.updateOne(
      { _id: source._id },
      { $set: { ingestion: { status: 'queued', totalChunks: total, embeddedChunks: total - pending } } },
    );
  }
  logger.info('Resuming legal source ingestion', { legalSourceId: id, pendingChunks: pending, previousStatus: status });
  await startIngestion(source.id);
  return getLegalSource(source.id);
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
    inCatalog: isCatalogLegalSourceCode(source.code),
  }));
}

export async function getLegalSource(id: string) {
  const source = await LegalSourceModel.findById(id);
  if (!source) {
    throw AppError.notFound('Legal source not found');
  }
  const chunkCount = await LegalKnowledgeChunkModel.countDocuments({ legalSourceId: source._id });
  return { ...source.toObject(), chunkCount, inCatalog: isCatalogLegalSourceCode(source.code) };
}

export async function listLegalSourceCatalog() {
  const codes = Object.keys(LEGAL_SOURCE_CATALOG) as LegalSourceCode[];
  const [sources, profiles] = await Promise.all([
    LegalSourceModel.find({ code: { $in: codes } }).select('code title status ingestion.status'),
    ContractProfileModel.find({ legalSourceCodes: { $in: codes } }).select('code name legalSourceCodes'),
  ]);

  return codes.map((code) => {
    const source = sources.find((s) => s.code === code);
    return {
      code,
      label: LEGAL_SOURCE_CATALOG[code],
      usedByProfiles: profiles
        .filter((p) => p.legalSourceCodes.includes(code))
        .map((p) => ({ code: p.code, name: p.name })),
      ruleCodes: LEGAL_RULES.filter((r) => r.citations.some((c) => c.sourceCode === code)).map((r) => r.code),
      legalSource: source
        ? { _id: source.id, title: source.title, status: source.status, ingestionStatus: source.ingestion?.status ?? null }
        : null,
    };
  });
}

export async function deleteLegalSource(id: string) {
  const source = await LegalSourceModel.findById(id);
  if (!source) {
    throw AppError.notFound('Legal source not found');
  }
  await LegalSourceModel.deleteOne({ _id: id });
  await LegalKnowledgeChunkModel.deleteMany({ legalSourceId: id });
}
