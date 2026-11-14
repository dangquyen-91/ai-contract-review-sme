import { HydratedDocument, Types } from 'mongoose';
import { AppError } from '../../errors/AppError';
import { LegalSource, LegalSourceModel, LegalSourcePart } from '../../models/legalSource.model';
import { LegalKnowledgeChunkModel } from '../../models/legalKnowledgeChunk.model';
import {
  CONSOLIDATED_ONLY_MESSAGE,
  AppendLegalSourcePartInput,
  CreateLegalSourceInput,
  PreviewNewLegalSourceInput,
  UpdateLegalSourceInput,
} from '../../validations/legalSource.validation';
import {
  assertAnchors,
  assertCrossReference,
  assertDocumentNumber,
  assertOrigin,
  checkAnchors,
  checkCrossReference,
  checkDocumentNumber,
  checkOrigin,
  CrossCheck,
  crossCheckWarnings,
  documentNumberWarnings,
  OriginLike,
} from './legalSourceChecks';
import type { LegalArticleText } from './legalDocumentParser.service';
import type { ArticleDifference } from './legalCrossCheck';
import { actorsById, fieldChanges, LegalActor, recordLegalSourceEvent } from './legalSourceHistory.service';
import {
  AnalyzedLegalText,
  analyzeLegalText,
  extractLegalText,
  LEGAL_EMBEDDING_MODEL,
  NEEDS_EMBEDDING,
  OUTDATED_EMBEDDING,
} from './legalKnowledgeIngest.service';
import {
  buildLegalCoverage,
  cleanupWarnings,
  extractionWarnings,
  LegalChunkDraft,
  LegalExtractionQuality,
  LegalTextCleanup,
  StoredLegalExtractionQuality,
  StoredLegalTextCleanup,
} from './legalDocumentParser.service';
import { isLegalIngestionJobAlive, queueLegalIngestion } from './legalIngestionWorker.service';
import { isLlmConfigured } from '../ai/llm.service';
import { logger } from '../../config/logger';
import { ContractProfileModel } from '../../models/contractProfile.model';
import { isCatalogLegalSourceCode, LEGAL_SOURCE_CATALOG, LegalSourceCode } from './legalSourceCatalog.data';
import { LEGAL_RULES } from './legalRules.data';
import { fileHashOf } from '../contract/contractVersion.service';
import {
  createFileDownloadLink,
  deleteContractFile,
  StoredFile,
  storedFileOf,
  uploadPrivateFile,
} from '../contract/storage.service';

const PREVIEW_TEXT_CHARS = 120;

export interface LegalFile {
  buffer: Buffer;
  mimeType: string;
  name?: string;
}

export async function analyzeLegalFile(file: LegalFile, expectedArticleCount?: number): Promise<AnalyzedLegalText> {
  const extracted = await extractLegalText(file.buffer, file.mimeType);
  if (!extracted.text.trim()) {
    throw AppError.badRequest('No text could be extracted from the uploaded file');
  }
  const analyzed = analyzeLegalText(extracted, expectedArticleCount);
  if (analyzed.chunks.length === 0) {
    throw AppError.badRequest('The uploaded file contains no usable legal text');
  }
  return analyzed;
}

export async function crossCheckOf(
  mainOrigin: OriginLike | null | undefined,
  mainArticles: LegalArticleText[],
  mainFile: LegalFile,
  referenceFile?: LegalFile,
  referenceOrigin?: OriginLike | null,
): Promise<CrossCheck> {
  if (!referenceFile) return checkCrossReference({ mainOrigin, mainArticles });
  const reference = await analyzeLegalFile(referenceFile);
  return checkCrossReference({
    mainOrigin,
    mainArticles,
    reference: {
      articles: reference.articleTexts,
      origin: referenceOrigin,
      sameFile: fileHashOf(referenceFile.buffer) === fileHashOf(mainFile.buffer),
    },
  });
}

export function assertLlmConfigured() {
  if (!isLlmConfigured) throw AppError.badRequest('LLM is not configured. Set GEMINI_API_KEY.');
}

export async function previewLegalSource(file: LegalFile, input: PreviewNewLegalSourceInput, referenceFile?: LegalFile) {
  const { documentNumber, coverage, cleanup, extraction, chunks, articleTexts } = await analyzeLegalFile(
    file,
    input.expectedArticleCount,
  );
  const crossCheck = await crossCheckOf(input.origin, articleTexts, file, referenceFile, input.referenceOrigin);
  const numberCheck = checkDocumentNumber(input.documentNumber, documentNumber, input.textKind);
  coverage.warnings.push(...documentNumberWarnings(numberCheck));
  return {
    documentNumber,
    coverage,
    cleanup,
    extraction,
    checks: {
      origin: checkOrigin(input.origin, input.gazette),
      documentNumber: numberCheck,
      anchors: checkAnchors(input.code, chunks),
      crossCheck,
    },
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

export interface StoredLegalFile {
  stored: StoredFile;
  fileHash: string;
}

const legalSourceFolder = (legalSourceId: Types.ObjectId) => `legal-sources/${legalSourceId.toString()}`;

export async function assertFileNotStored(fileHash: string, exceptLegalSourceId?: Types.ObjectId) {
  const existing = await LegalSourceModel.findOne({
    'parts.fileHash': fileHash,
    ...(exceptLegalSourceId ? { _id: { $ne: exceptLegalSourceId } } : {}),
  }).select('code title');
  if (!existing) return;
  throw AppError.conflict(
    `This file was already uploaded to the legal source "${existing.title}"`,
    'DUPLICATE_LEGAL_FILE',
    { legalSourceId: existing.id, code: existing.code, title: existing.title },
  );
}

export async function storeLegalFile(legalSourceId: Types.ObjectId, file: LegalFile, fileHash: string): Promise<StoredLegalFile> {
  const stored = await uploadPrivateFile(file.buffer, legalSourceFolder(legalSourceId), file.name || 'legal-source');
  return { stored, fileHash };
}

export async function discardLegalFiles(files: (StoredFile | undefined)[]) {
  await Promise.all(
    files.flatMap((file) =>
      file
        ? [
            deleteContractFile(file).catch((err) =>
              logger.warn('Failed to remove a stored legal source file', {
                fileKey: file.key,
                error: err instanceof Error ? err.message : String(err),
              }),
            ),
          ]
        : [],
    ),
  );
}

export interface PartReading {
  cleanup: LegalTextCleanup;
  extraction: LegalExtractionQuality;
  notes?: string[];
}

export function partReadingOf(
  chunks: LegalChunkDraft[],
  { cleanup, extraction, notes }: PartReading,
  skippedArticles: string[],
) {
  const numbers = chunks.flatMap((c) => (c.articleNumber === undefined ? [] : [c.articleNumber]));
  return {
    articleFrom: numbers.length ? Math.min(...numbers) : undefined,
    articleTo: numbers.length ? Math.max(...numbers) : undefined,
    chunkCount: chunks.length,
    skippedArticles,
    cleanup,
    extraction,
    notes: notes?.length ? notes : undefined,
  };
}

interface StoredCrossCheckFields {
  result: string;
  referenceFileName?: string | null;
  referenceFileKey?: string | null;
  referenceFileResourceType?: string | null;
  referenceFileDeliveryType?: string | null;
  referenceFileFormat?: string | null;
  referenceFileHash?: string | null;
  referenceMimeType?: string | null;
  referenceFileSize?: number | null;
  referenceOrigin?: unknown;
  compared: number;
  differing: number;
  onlyInReference: number;
  differences?: string[] | null;
  acknowledged: boolean;
  checkedAt: Date;
}

export interface StoredReference {
  stored: StoredFile;
  record: StoredCrossCheckFields;
}

const differenceLabel = (difference: ArticleDifference) =>
  difference.kind === 'missing_in_reference'
    ? `${difference.article} (missing in the reference)`
    : `${difference.article} (${difference.similarity}% similar)`;

export async function storeReferenceFile(
  legalSourceId: Types.ObjectId,
  referenceFile: LegalFile | undefined,
  crossCheck: CrossCheck,
  referenceOrigin: OriginLike | null | undefined,
  acknowledged: boolean | undefined,
): Promise<StoredReference | undefined> {
  if (!referenceFile || (crossCheck.result !== 'same' && crossCheck.result !== 'different')) return undefined;
  const stored = await uploadPrivateFile(
    referenceFile.buffer,
    `${legalSourceFolder(legalSourceId)}/reference`,
    referenceFile.name || 'reference',
  );
  return {
    stored,
    record: {
      result: crossCheck.result,
      referenceFileName: referenceFile.name,
      referenceFileKey: stored.key,
      referenceFileResourceType: stored.resourceType,
      referenceFileDeliveryType: stored.deliveryType,
      referenceFileFormat: stored.format,
      referenceFileHash: fileHashOf(referenceFile.buffer),
      referenceMimeType: referenceFile.mimeType,
      referenceFileSize: referenceFile.buffer.length,
      referenceOrigin: referenceOrigin ?? undefined,
      compared: crossCheck.compared,
      differing: crossCheck.differing,
      onlyInReference: crossCheck.onlyInReference,
      differences: crossCheck.differences.map(differenceLabel),
      acknowledged: crossCheck.result === 'different' && Boolean(acknowledged),
      checkedAt: new Date(),
    },
  };
}

export const storedReferenceOf = (crossCheck: StoredCrossCheckFields | null | undefined) =>
  crossCheck
    ? storedFileOf({
        fileKey: crossCheck.referenceFileKey,
        fileResourceType: crossCheck.referenceFileResourceType,
        fileDeliveryType: crossCheck.referenceFileDeliveryType,
        fileFormat: crossCheck.referenceFileFormat,
      })
    : undefined;

function presentCrossCheck(crossCheck: StoredCrossCheckFields) {
  return {
    result: crossCheck.result,
    referenceFileName: crossCheck.referenceFileName ?? undefined,
    referenceFileHash: crossCheck.referenceFileHash ?? undefined,
    referenceMimeType: crossCheck.referenceMimeType ?? undefined,
    referenceFileSize: crossCheck.referenceFileSize ?? undefined,
    referenceOrigin: crossCheck.referenceOrigin ?? undefined,
    hasReferenceFile: Boolean(crossCheck.referenceFileKey),
    compared: crossCheck.compared,
    differing: crossCheck.differing,
    onlyInReference: crossCheck.onlyInReference,
    differences: crossCheck.differences ?? [],
    acknowledged: crossCheck.acknowledged,
    checkedAt: crossCheck.checkedAt,
  };
}

export function partOf(
  file: LegalFile,
  chunks: LegalChunkDraft[],
  { stored, fileHash }: StoredLegalFile,
  reading: PartReading,
  skippedArticles: string[] = [],
  crossCheck?: StoredCrossCheckFields,
) {
  return {
    ...(crossCheck ? { crossCheck } : {}),
    fileName: file.name,
    ...partReadingOf(chunks, reading, skippedArticles),
    uploadedAt: new Date(),
    fileKey: stored.key,
    fileResourceType: stored.resourceType,
    fileDeliveryType: stored.deliveryType,
    fileFormat: stored.format,
    fileHash,
    mimeType: file.mimeType,
    fileSize: file.buffer.length,
  };
}

export const partNotes = (
  parts: {
    cleanup?: StoredLegalTextCleanup | null;
    extraction?: StoredLegalExtractionQuality | null;
    notes?: string[] | null;
  }[],
) =>
  parts.flatMap((part) => [
    ...extractionWarnings(part.extraction),
    ...cleanupWarnings(part.cleanup),
    ...(part.notes ?? []),
  ]);

function presentPart(part: LegalSourcePart) {
  return {
    fileName: part.fileName,
    articleFrom: part.articleFrom,
    articleTo: part.articleTo,
    chunkCount: part.chunkCount,
    skippedArticles: part.skippedArticles,
    uploadedAt: part.uploadedAt,
    cleanup: part.cleanup ?? undefined,
    extraction: part.extraction ?? undefined,
    notes: part.notes?.length ? part.notes : undefined,
    crossCheck: part.crossCheck ? presentCrossCheck(part.crossCheck) : undefined,
    hasFile: Boolean(part.fileKey),
    fileHash: part.fileHash,
    mimeType: part.mimeType,
    fileSize: part.fileSize,
  };
}

interface ChunkCounts {
  chunkCount: number;
  outdatedEmbeddingCount: number;
}

function presentLegalSource(source: HydratedDocument<LegalSource>, { chunkCount, outdatedEmbeddingCount }: ChunkCounts) {
  return {
    ...source.toObject(),
    parts: source.parts.map(presentPart),
    previousParts: source.previousParts.map((part) => ({
      ...presentPart(part),
      replacedAt: part.get('replacedAt') as Date | undefined,
    })),
    chunkCount,
    embeddingModel: LEGAL_EMBEDDING_MODEL,
    outdatedEmbeddingCount,
    inCatalog: isCatalogLegalSourceCode(source.code),
  };
}

export const chunkDocs = (legalSourceId: Types.ObjectId, chunks: LegalChunkDraft[], firstOrder = 0) =>
  chunks.map((chunk, i) => ({ ...chunk, order: firstOrder + i, legalSourceId }));

export async function startIngestion(legalSourceId: string) {
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
  referenceFile?: LegalFile;
  actor: LegalActor;
}

const duplicateCode = (code: string) => AppError.conflict(`A legal source with code "${code}" already exists`);

export async function createLegalSource({ input, file, referenceFile, actor }: CreateLegalSourceParams) {
  const { expectedArticleCount, documentNumber, referenceOrigin, acknowledgeDifferences, ...metadata } = input;
  assertLlmConfigured();
  assertOrigin(checkOrigin(metadata.origin, metadata.gazette));
  if (await LegalSourceModel.exists({ code: metadata.code })) throw duplicateCode(metadata.code);
  const analyzed = await analyzeLegalFile(file, expectedArticleCount);
  const numberCheck = checkDocumentNumber(documentNumber, analyzed.documentNumber, metadata.textKind);
  assertDocumentNumber(numberCheck);
  assertAnchors(checkAnchors(metadata.code, analyzed.chunks));
  const crossCheck = await crossCheckOf(metadata.origin, analyzed.articleTexts, file, referenceFile, referenceOrigin);
  assertCrossReference(crossCheck, acknowledgeDifferences);
  const notes = [...documentNumberWarnings(numberCheck), ...crossCheckWarnings(crossCheck)];
  analyzed.coverage.warnings.push(...notes);
  const fileHash = fileHashOf(file.buffer);
  await assertFileNotStored(fileHash);

  const legalSourceId = new Types.ObjectId();
  const upload = await storeLegalFile(legalSourceId, file, fileHash);
  let reference: StoredReference | undefined;
  try {
    reference = await storeReferenceFile(legalSourceId, referenceFile, crossCheck, referenceOrigin, acknowledgeDifferences);
  } catch (err) {
    await discardLegalFiles([upload.stored]);
    throw err;
  }
  const storedFiles = [upload.stored, reference?.stored];

  let source;
  try {
    source = await LegalSourceModel.create({
      _id: legalSourceId,
      ...metadata,
      createdBy: actor.id,
      updatedBy: actor.id,
      documentNumber: documentNumber ?? analyzed.documentNumber,
      coverage: analyzed.coverage,
      ingestion: { status: 'queued', totalChunks: analyzed.chunks.length, embeddedChunks: 0 },
      parts: [partOf(file, analyzed.chunks, upload, { ...analyzed, notes }, [], reference?.record)],
    });
  } catch (err) {
    await discardLegalFiles(storedFiles);
    if ((err as { code?: number }).code === 11000) throw duplicateCode(metadata.code);
    throw err;
  }

  try {
    await LegalKnowledgeChunkModel.insertMany(chunkDocs(source._id, analyzed.chunks));
    await queueLegalIngestion(source.id);
  } catch (err) {
    await LegalKnowledgeChunkModel.deleteMany({ legalSourceId: source._id });
    await LegalSourceModel.deleteOne({ _id: source._id });
    await discardLegalFiles(storedFiles);
    throw err;
  }
  await recordLegalSourceEvent({
    source,
    action: 'created',
    actor,
    details: {
      fileName: file.name,
      fileHash,
      origin: metadata.origin,
      textKind: metadata.textKind,
      documentNumber: source.documentNumber,
      chunkCount: analyzed.chunks.length,
      crossCheck: crossCheck.result,
      warnings: analyzed.coverage.warnings.length,
    },
  });
  return getLegalSource(source.id);
}

async function coverageOfStoredChunks(
  legalSourceId: Types.ObjectId,
  headingCount: number,
  expectedArticleCount: number | undefined,
  notes: string[],
) {
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
    notes,
  });
}

export async function appendLegalSourcePart(
  id: string,
  actor: LegalActor,
  file: LegalFile,
  { expectedArticleCount, referenceOrigin, acknowledgeDifferences }: AppendLegalSourcePartInput = {},
  referenceFile?: LegalFile,
) {
  assertLlmConfigured();
  const source = await LegalSourceModel.findById(id);
  if (!source) throw AppError.notFound('Legal source not found');
  const analyzed = await analyzeLegalFile(file);
  const numberCheck = checkDocumentNumber(source.documentNumber, analyzed.documentNumber, source.textKind);
  assertDocumentNumber(numberCheck);
  const reading = { ...analyzed, notes: documentNumberWarnings(numberCheck) };
  const fileHash = fileHashOf(file.buffer);
  await assertFileNotStored(fileHash);

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
  assertAnchors(checkAnchors(source.code, fresh));
  const freshKeys = new Set(fresh.map((chunk) => chunk.articleKey ?? ''));
  const crossCheck = await crossCheckOf(
    source.origin,
    analyzed.articleTexts.filter((article) => freshKeys.has(article.key)),
    file,
    referenceFile,
    referenceOrigin,
  );
  assertCrossReference(crossCheck, acknowledgeDifferences);
  reading.notes.push(...crossCheckWarnings(crossCheck));

  const upload = await storeLegalFile(source._id, file, fileHash);
  let reference: StoredReference | undefined;
  try {
    reference = await storeReferenceFile(source._id, referenceFile, crossCheck, referenceOrigin, acknowledgeDifferences);
  } catch (err) {
    await discardLegalFiles([upload.stored]);
    throw err;
  }
  const storedFiles = [upload.stored, reference?.stored];
  const last = await LegalKnowledgeChunkModel.findOne({ legalSourceId: source._id }).sort({ order: -1 }).select('order');
  let insertedIds: Types.ObjectId[];
  try {
    const inserted = await LegalKnowledgeChunkModel.insertMany(chunkDocs(source._id, fresh, (last?.order ?? -1) + 1));
    insertedIds = inserted.map((chunk) => chunk._id);
  } catch (err) {
    await discardLegalFiles(storedFiles);
    if ((err as { code?: number }).code === 11000) {
      throw AppError.conflict('Another part of this legal source is being uploaded; try again');
    }
    throw err;
  }

  try {
    const expected = expectedArticleCount ?? source.coverage?.expectedArticleCount ?? undefined;
    const coverage = await coverageOfStoredChunks(
      source._id,
      (source.coverage?.headingCount ?? 0) + analyzed.headingCount,
      expected,
      [...partNotes(source.parts), ...partNotes([reading])],
    );
    const totalChunks = coverage.chunkCount;
    await LegalSourceModel.updateOne(
      { _id: source._id },
      {
        $set: {
          coverage,
          updatedBy: actor.id,
          'ingestion.totalChunks': totalChunks,
          ...(source.documentNumber || !analyzed.documentNumber ? {} : { documentNumber: analyzed.documentNumber }),
          ...(source.ingestion ? {} : { 'ingestion.embeddedChunks': totalChunks - fresh.length }),
        },
        $push: { parts: partOf(file, fresh, upload, reading, skippedArticles, reference?.record) },
      },
    );
  } catch (err) {
    await LegalKnowledgeChunkModel.deleteMany({ _id: { $in: insertedIds } });
    await discardLegalFiles(storedFiles);
    throw err;
  }
  await recordLegalSourceEvent({
    source,
    action: 'part_appended',
    actor,
    details: {
      partIndex: source.parts.length,
      fileName: file.name,
      fileHash,
      chunkCount: fresh.length,
      skippedArticles: skippedArticles.length,
      crossCheck: crossCheck.result,
    },
  });
  await startIngestion(source.id);
  return getLegalSource(source.id);
}

export async function resumeLegalIngestion(id: string, actor: LegalActor) {
  assertLlmConfigured();
  const source = await LegalSourceModel.findById(id);
  if (!source) throw AppError.notFound('Legal source not found');

  const pending = await LegalKnowledgeChunkModel.countDocuments({ legalSourceId: source._id, ...NEEDS_EMBEDDING });
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
  await recordLegalSourceEvent({
    source,
    action: 'ingestion_resumed',
    actor,
    details: { pendingChunks: pending, previousStatus: status ?? null },
  });
  return getLegalSource(source.id);
}

export async function listLegalSources() {
  const sources = await LegalSourceModel.find().sort({ createdAt: -1 });
  const chunkCounts = await LegalKnowledgeChunkModel.aggregate<{ _id: Types.ObjectId; count: number; outdated: number }>([
    {
      $group: {
        _id: '$legalSourceId',
        count: { $sum: 1 },
        outdated: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: [{ $type: '$embedding' }, 'missing'] },
                  { $ne: ['$embeddingModel', LEGAL_EMBEDDING_MODEL] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);
  const countsBySourceId = new Map(chunkCounts.map((c) => [c._id.toString(), c]));

  return sources.map((source) => {
    const counts = countsBySourceId.get(source._id.toString());
    return presentLegalSource(source, { chunkCount: counts?.count ?? 0, outdatedEmbeddingCount: counts?.outdated ?? 0 });
  });
}

export async function getLegalSource(id: string) {
  const source = await LegalSourceModel.findById(id);
  if (!source) {
    throw AppError.notFound('Legal source not found');
  }
  const [chunkCount, outdatedEmbeddingCount, actors] = await Promise.all([
    LegalKnowledgeChunkModel.countDocuments({ legalSourceId: source._id }),
    LegalKnowledgeChunkModel.countDocuments({ legalSourceId: source._id, ...OUTDATED_EMBEDDING }),
    actorsById([source.createdBy, source.updatedBy]),
  ]);
  const actorOf = (userId: unknown) =>
    userId ? (actors.get(String(userId)) ?? { id: String(userId), name: null, email: null }) : null;
  return {
    ...presentLegalSource(source, { chunkCount, outdatedEmbeddingCount }),
    createdBy: actorOf(source.createdBy),
    updatedBy: actorOf(source.updatedBy),
  };
}

export async function getLegalSourcePartFile(id: string, partIndex: number, previous = false, reference = false) {
  const source = await LegalSourceModel.findById(id).select('parts previousParts');
  if (!source) throw AppError.notFound('Legal source not found');
  const part = previous ? source.previousParts[partIndex] : source.parts[partIndex];
  if (!part) throw AppError.notFound('Legal source part not found');
  if (reference) {
    const storedReference = storedReferenceOf(part.crossCheck);
    if (!storedReference) {
      throw AppError.notFound('This part was not compared with a reference file', 'LEGAL_REFERENCE_FILE_NOT_STORED');
    }
    return {
      ...createFileDownloadLink(storedReference),
      fileName: part.crossCheck?.referenceFileName ?? undefined,
      mimeType: part.crossCheck?.referenceMimeType ?? undefined,
      fileHash: part.crossCheck?.referenceFileHash ?? undefined,
    };
  }
  const stored = storedFileOf(part);
  if (!stored) {
    throw AppError.notFound(
      'This part was uploaded before original files were kept; upload it again to store the file',
      'LEGAL_FILE_NOT_STORED',
    );
  }
  return {
    ...createFileDownloadLink(stored),
    fileName: part.fileName ?? undefined,
    mimeType: part.mimeType ?? undefined,
    fileHash: part.fileHash ?? undefined,
  };
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

export async function updateLegalSource(id: string, actor: LegalActor, input: UpdateLegalSourceInput) {
  const source = await LegalSourceModel.findById(id);
  if (!source) throw AppError.notFound('Legal source not found');
  const { expectedArticleCount, ...fields } = input;

  const effectiveDate = fields.effectiveDate === undefined ? source.effectiveDate : fields.effectiveDate;
  const expiryDate = fields.expiryDate === undefined ? source.expiryDate : fields.expiryDate;
  if (effectiveDate && expiryDate && expiryDate <= effectiveDate) {
    throw AppError.badRequest('expiryDate must be after effectiveDate');
  }
  const textKind = fields.textKind === undefined ? source.textKind : fields.textKind;
  const consolidatedThrough =
    fields.consolidatedThrough === undefined ? source.consolidatedThrough : fields.consolidatedThrough;
  if (consolidatedThrough?.length && textKind !== 'consolidated') {
    throw AppError.badRequest(CONSOLIDATED_ONLY_MESSAGE);
  }

  const set: Record<string, unknown> = {};
  const unset: Record<string, ''> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === null) unset[key] = '';
    else if (value !== undefined) set[key] = value;
  }
  const changes = fieldChanges(
    { ...source.toObject(), expectedArticleCount: source.coverage?.expectedArticleCount },
    {
      ...set,
      ...Object.fromEntries(Object.keys(unset).map((key) => [key, null])),
      ...(expectedArticleCount !== undefined ? { expectedArticleCount } : {}),
    },
  );
  if (Object.keys(changes).length > 0) set.updatedBy = actor.id;
  if (expectedArticleCount !== undefined) {
    set.coverage = await coverageOfStoredChunks(
      source._id,
      source.coverage?.headingCount ?? 0,
      expectedArticleCount ?? undefined,
      partNotes(source.parts),
    );
  }

  await LegalSourceModel.updateOne(
    { _id: source._id },
    {
      ...(Object.keys(set).length ? { $set: set } : {}),
      ...(Object.keys(unset).length ? { $unset: unset } : {}),
    },
    { runValidators: true },
  );
  if (Object.keys(changes).length > 0) {
    await recordLegalSourceEvent({
      source: { _id: source._id, code: source.code, title: (fields.title as string | undefined) ?? source.title },
      action: changes.status ? 'status_changed' : 'updated',
      actor,
      details: { changes },
    });
  }
  return getLegalSource(source.id);
}

export async function deleteLegalSource(id: string, actor: LegalActor) {
  const source = await LegalSourceModel.findById(id);
  if (!source) {
    throw AppError.notFound('Legal source not found');
  }
  const chunkCount = await LegalKnowledgeChunkModel.countDocuments({ legalSourceId: source._id });
  await LegalSourceModel.deleteOne({ _id: id });
  await LegalKnowledgeChunkModel.deleteMany({ legalSourceId: id });
  await discardLegalFiles(
    [...source.parts, ...source.previousParts].flatMap((part) => [storedFileOf(part), storedReferenceOf(part.crossCheck)]),
  );
  await recordLegalSourceEvent({
    source,
    action: 'deleted',
    actor,
    details: {
      chunkCount,
      documentNumber: source.documentNumber,
      files: [...source.parts, ...source.previousParts].map((part) => ({ fileName: part.fileName, fileHash: part.fileHash })),
    },
  });
}
