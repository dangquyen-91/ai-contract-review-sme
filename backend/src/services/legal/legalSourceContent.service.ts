import mongoose, { HydratedDocument, Types } from 'mongoose';
import { AppError } from '../../errors/AppError';
import { LegalSource, LegalSourceModel } from '../../models/legalSource.model';
import { LegalKnowledgeChunkModel } from '../../models/legalKnowledgeChunk.model';
import { RiskCitationModel } from '../../models/riskCitation.model';
import {
  CONSOLIDATED_ONLY_MESSAGE,
  ReplaceLegalSourceContentInput,
} from '../../validations/legalSource.validation';
import { fileHashOf } from '../contract/contractVersion.service';
import { downloadContractFile, storedFileOf } from '../contract/storage.service';
import { buildLegalCoverage, LegalChunkDraft } from './legalDocumentParser.service';
import { AnalyzedLegalText, NEEDS_EMBEDDING } from './legalKnowledgeIngest.service';
import {
  analyzeLegalFile,
  assertFileNotStored,
  assertLlmConfigured,
  crossCheckOf,
  discardLegalFiles,
  getLegalSource,
  LegalFile,
  partNotes,
  partOf,
  partReadingOf,
  startIngestion,
  storeLegalFile,
  StoredReference,
  storeReferenceFile,
} from './legalSource.service';
import { LegalActor, recordLegalSourceEvent } from './legalSourceHistory.service';
import {
  AnchorCheck,
  anchorWarnings,
  assertAnchors,
  assertCrossReference,
  crossCheckWarnings,
  assertDocumentNumber,
  assertOrigin,
  checkAnchors,
  checkDocumentNumber,
  checkOrigin,
  DocumentNumberCheck,
  documentNumberWarnings,
} from './legalSourceChecks';
import {
  ChunkReconciliation,
  ExistingLegalChunk,
  reconcileLegalChunks,
  summarizeReconciliation,
} from './legalChunkReconcile';

export interface AnalyzedPart {
  file: LegalFile;
  analyzed: AnalyzedLegalText;
  chunks: LegalChunkDraft[];
  skippedArticles: string[];
  notes: string[];
}

export interface AnalyzedContent {
  documentNumber?: string;
  headingCount: number;
  parts: AnalyzedPart[];
  drafts: LegalChunkDraft[];
  coverage: ReturnType<typeof buildLegalCoverage>;
}

export async function analyzeContent(files: LegalFile[], expectedArticleCount?: number): Promise<AnalyzedContent> {
  const seen = new Set<string>();
  const parts: AnalyzedPart[] = [];
  for (const file of files) {
    const analyzed = await analyzeLegalFile(file);
    const chunks = analyzed.chunks.filter((c) => !c.articleKey || !seen.has(c.articleKey));
    const skippedArticles = [
      ...new Set(analyzed.chunks.filter((c) => c.articleKey && seen.has(c.articleKey)).map((c) => c.articleKey!)),
    ];
    for (const chunk of chunks) if (chunk.articleKey) seen.add(chunk.articleKey);
    parts.push({ file, analyzed, chunks, skippedArticles, notes: [] });
  }

  const drafts = parts.flatMap((part) => part.chunks).map((chunk, order) => ({ ...chunk, order }));
  const articles = new Map<string, { number: number; suffix: string }>();
  for (const draft of drafts) {
    if (draft.articleKey && draft.articleNumber !== undefined) {
      articles.set(draft.articleKey, {
        number: draft.articleNumber,
        suffix: draft.articleKey.slice(String(draft.articleNumber).length),
      });
    }
  }
  const headingCount = parts.reduce((sum, part) => sum + part.analyzed.headingCount, 0);
  return {
    documentNumber: parts.find((part) => part.analyzed.documentNumber)?.analyzed.documentNumber,
    headingCount,
    parts,
    drafts,
    coverage: buildLegalCoverage({
      articles: [...articles.values()],
      headingCount,
      chunkCount: drafts.length,
      expectedArticleCount,
      notes: partNotes(parts.map((part) => part.analyzed)),
    }),
  };
}

async function loadSource(id: string) {
  const source = await LegalSourceModel.findById(id);
  if (!source) throw AppError.notFound('Legal source not found');
  return source;
}

export async function loadStoredPartFiles(source: HydratedDocument<LegalSource>): Promise<LegalFile[]> {
  const missing = source.parts.flatMap((part, index) => (storedFileOf(part) && part.mimeType ? [] : [index]));
  if (missing.length > 0) {
    throw new AppError(
      `Part(s) ${missing.join(', ')} were uploaded before original files were kept; replace the content with a new file instead`,
      409,
      true,
      'LEGAL_FILE_NOT_STORED',
      { partIndexes: missing },
    );
  }
  return Promise.all(
    source.parts.map(async (part, index) => {
      const buffer = await downloadContractFile(storedFileOf(part)!);
      if (part.fileHash && fileHashOf(buffer) !== part.fileHash) {
        throw new AppError(
          `The stored file of part ${index} no longer matches its recorded SHA-256`,
          409,
          true,
          'LEGAL_FILE_CHANGED',
          { partIndex: index },
        );
      }
      return { buffer, mimeType: part.mimeType!, name: part.fileName ?? undefined };
    }),
  );
}

export async function reconcileWithStored(legalSourceId: Types.ObjectId, drafts: LegalChunkDraft[]) {
  const stored = await LegalKnowledgeChunkModel.find({ legalSourceId })
    .select('order chunkText articleRef articleKey hierarchy')
    .lean();
  const existing: ExistingLegalChunk[] = stored.map((chunk) => ({
    id: chunk._id.toString(),
    order: chunk.order,
    chunkText: chunk.chunkText,
    articleRef: chunk.articleRef,
    articleKey: chunk.articleKey,
    hierarchy: chunk.hierarchy?.map((h) => ({ level: h.level, number: h.number, title: h.title ?? undefined })),
  }));
  return reconcileLegalChunks(existing, drafts);
}

async function changesOf(plan: ChunkReconciliation) {
  const removedIds = plan.removed.map((chunk) => new Types.ObjectId(chunk.id));
  const removedCitations = removedIds.length
    ? await RiskCitationModel.countDocuments({ legalKnowledgeChunkId: { $in: removedIds } })
    : 0;
  return { ...summarizeReconciliation(plan), removedCitations };
}

function presentAnalyzedParts(content: AnalyzedContent) {
  return content.parts.map((part) => ({
    fileName: part.file.name,
    chunkCount: part.chunks.length,
    skippedArticles: part.skippedArticles,
    cleanup: part.analyzed.cleanup,
    extraction: part.analyzed.extraction,
    notes: part.notes,
  }));
}

function noteDocumentNumber(content: AnalyzedContent, check: DocumentNumberCheck, blocking: boolean) {
  if (blocking) assertDocumentNumber(check);
  const notes = blocking
    ? documentNumberWarnings(check)
    : check.result === 'mismatch' || check.result === 'consolidated_number'
      ? [check.message!]
      : [];
  const target = content.parts.find((part) => part.analyzed.documentNumber) ?? content.parts[0];
  target.notes.push(...notes);
  content.coverage.warnings.push(...notes);
}

function noteAnchors(content: AnalyzedContent, check: AnchorCheck, blocking: boolean) {
  if (blocking) {
    assertAnchors(check);
    return;
  }
  const notes = anchorWarnings(check);
  content.parts[0].notes.push(...notes);
  content.coverage.warnings.push(...notes);
}

async function previewOf(source: HydratedDocument<LegalSource>, content: AnalyzedContent, checks: Record<string, unknown>) {
  const plan = await reconcileWithStored(source._id, content.drafts);
  return {
    documentNumber: content.documentNumber,
    coverage: content.coverage,
    parts: presentAnalyzedParts(content),
    checks,
    changes: await changesOf(plan),
  };
}

const expectedCountOf = (source: HydratedDocument<LegalSource>, expectedArticleCount?: number) =>
  expectedArticleCount ?? source.coverage?.expectedArticleCount ?? undefined;

async function analyzeStoredContent(source: HydratedDocument<LegalSource>, expectedArticleCount?: number) {
  const files = await loadStoredPartFiles(source);
  const content = await analyzeContent(files, expectedCountOf(source, expectedArticleCount));
  const documentNumber = checkDocumentNumber(source.documentNumber, content.documentNumber, source.textKind);
  noteDocumentNumber(content, documentNumber, false);
  const anchors = checkAnchors(source.code, content.drafts);
  noteAnchors(content, anchors, false);
  return { content, checks: { documentNumber, anchors } };
}

export async function previewReparse(id: string, expectedArticleCount?: number) {
  const source = await loadSource(id);
  const { content, checks } = await analyzeStoredContent(source, expectedArticleCount);
  return previewOf(source, content, checks);
}

export async function assertReplacementFile(source: HydratedDocument<LegalSource>, fileHash: string) {
  if (source.parts.length === 1 && source.parts[0].fileHash === fileHash) {
    throw AppError.conflict(
      'This file is identical to the stored file; use reparse to read it again',
      'SAME_LEGAL_FILE',
    );
  }
  await assertFileNotStored(fileHash, source._id);
}

async function replacementChecks(
  source: HydratedDocument<LegalSource>,
  content: AnalyzedContent,
  input: ReplaceLegalSourceContentInput,
  file: LegalFile,
  referenceFile?: LegalFile,
) {
  return {
    crossCheck: await crossCheckOf(
      input.origin ?? source.origin,
      content.parts[0].analyzed.articleTexts,
      file,
      referenceFile,
      input.referenceOrigin,
    ),
    origin: checkOrigin(input.origin ?? source.origin, source.gazette),
    documentNumber: checkDocumentNumber(source.documentNumber, content.documentNumber, input.textKind ?? source.textKind),
    anchors: checkAnchors(source.code, content.drafts),
  };
}

export async function previewContentReplacement(
  id: string,
  file: LegalFile,
  input: ReplaceLegalSourceContentInput = {},
  referenceFile?: LegalFile,
) {
  const source = await loadSource(id);
  await assertReplacementFile(source, fileHashOf(file.buffer));
  const content = await analyzeContent([file], expectedCountOf(source, input.expectedArticleCount));
  const checks = await replacementChecks(source, content, input, file, referenceFile);
  noteDocumentNumber(content, checks.documentNumber, false);
  return previewOf(source, content, checks);
}

const ORDER_OFFSET = 1_000_000;
const CHUNK_FIELDS = [
  'chunkText',
  'articleRef',
  'articleNumber',
  'articleKey',
  'articleTitle',
  'clauseFrom',
  'clauseTo',
  'hierarchy',
] as const;

function chunkUpdate(draft: LegalChunkDraft, reembed: boolean) {
  const set: Record<string, unknown> = { order: draft.order };
  const unset: Record<string, ''> = {};
  for (const field of CHUNK_FIELDS) {
    const value = draft[field];
    if (value === undefined) unset[field] = '';
    else set[field] = value;
  }
  if (reembed) {
    unset.embedding = '';
    unset.embeddingModel = '';
  }
  return { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) };
}

interface ContentCommit {
  source: HydratedDocument<LegalSource>;
  content: AnalyzedContent;
  set: Record<string, unknown>;
  unset?: Record<string, ''>;
  push?: Record<string, unknown>;
  history: { actor: LegalActor; action: 'reparsed' | 'content_replaced'; details: Record<string, unknown> };
}

async function commitContent({ source, content, set, unset = {}, push, history }: ContentCommit) {
  const plan = await reconcileWithStored(source._id, content.drafts);
  const changes = await changesOf(plan);
  const totalChunks = content.drafts.length;

  await mongoose.connection.transaction(async (session) => {
    const updated = await LegalSourceModel.updateOne(
      { _id: source._id, updatedAt: source.updatedAt },
      {
        $set: {
          ...set,
          updatedBy: history.actor.id,
          coverage: content.coverage,
          ...(source.documentNumber || !content.documentNumber ? {} : { documentNumber: content.documentNumber }),
          ...(source.ingestion
            ? { 'ingestion.totalChunks': totalChunks }
            : { ingestion: { status: 'queued', totalChunks, embeddedChunks: 0 } }),
        },
        ...(Object.keys(unset).length ? { $unset: unset } : {}),
        ...(push ? { $push: push } : {}),
      },
      { session },
    );
    if (!updated.matchedCount) {
      throw AppError.conflict(
        'The legal source changed while it was being read again; preview it again and retry',
        'LEGAL_SOURCE_CHANGED',
      );
    }

    await LegalKnowledgeChunkModel.updateMany(
      { legalSourceId: source._id },
      [{ $set: { order: { $add: ['$order', ORDER_OFFSET] } } }],
      { session },
    );
    if (plan.removed.length > 0) {
      await LegalKnowledgeChunkModel.deleteMany(
        { _id: { $in: plan.removed.map((chunk) => new Types.ObjectId(chunk.id)) } },
        { session },
      );
    }
    const updates = [
      ...plan.unchanged.map((pair) => ({ pair, reembed: false })),
      ...plan.changed.map((pair) => ({ pair, reembed: true })),
    ];
    if (updates.length > 0) {
      await LegalKnowledgeChunkModel.bulkWrite(
        updates.map(({ pair, reembed }) => ({
          updateOne: { filter: { _id: pair.id }, update: chunkUpdate(pair.draft, reembed) },
        })),
        { session },
      );
    }
    if (plan.added.length > 0) {
      await LegalKnowledgeChunkModel.insertMany(
        plan.added.map((draft) => ({ ...draft, legalSourceId: source._id })),
        { session },
      );
    }
    await recordLegalSourceEvent(
      {
        source,
        action: history.action,
        actor: history.actor,
        details: {
          ...history.details,
          changes: {
            unchanged: changes.unchanged,
            changed: changes.changed,
            added: changes.added,
            removed: changes.removed,
            removedCitations: changes.removedCitations,
          },
          warnings: content.coverage.warnings.length,
        },
      },
      session,
    );
  });

  return changes;
}

async function finishContent(legalSourceId: Types.ObjectId, changes: Awaited<ReturnType<typeof changesOf>>) {
  const [pending, total] = await Promise.all([
    LegalKnowledgeChunkModel.countDocuments({ legalSourceId, ...NEEDS_EMBEDDING }),
    LegalKnowledgeChunkModel.countDocuments({ legalSourceId }),
  ]);
  if (pending > 0) {
    await startIngestion(legalSourceId.toString());
  } else {
    await LegalSourceModel.updateOne(
      { _id: legalSourceId },
      { $set: { 'ingestion.totalChunks': total, 'ingestion.embeddedChunks': total } },
    );
  }
  return { ...(await getLegalSource(legalSourceId.toString())), changes };
}

export async function applyReparse(id: string, actor: LegalActor, expectedArticleCount?: number) {
  assertLlmConfigured();
  const source = await loadSource(id);
  const { content } = await analyzeStoredContent(source, expectedArticleCount);
  const parts = source.parts.map((part, index) => {
    const read = content.parts[index];
    return {
      ...part.toObject(),
      ...partReadingOf(read.chunks, { ...read.analyzed, notes: read.notes }, read.skippedArticles),
    };
  });
  const changes = await commitContent({
    source,
    content,
    set: { parts },
    history: { actor, action: 'reparsed', details: { parts: parts.length } },
  });
  return finishContent(source._id, changes);
}

function provenanceUpdate(source: HydratedDocument<LegalSource>, input: ReplaceLegalSourceContentInput) {
  const textKind = input.textKind ?? source.textKind;
  const consolidatedThrough = input.consolidatedThrough ?? source.consolidatedThrough;
  if (consolidatedThrough?.length && textKind !== 'consolidated') {
    throw AppError.badRequest(CONSOLIDATED_ONLY_MESSAGE);
  }
  return {
    ...(input.origin ? { origin: input.origin } : {}),
    ...(input.textKind ? { textKind: input.textKind } : {}),
    ...(input.consolidatedThrough ? { consolidatedThrough: input.consolidatedThrough } : {}),
  };
}

export async function applyContentReplacement(
  id: string,
  actor: LegalActor,
  file: LegalFile,
  input: ReplaceLegalSourceContentInput = {},
  referenceFile?: LegalFile,
) {
  assertLlmConfigured();
  const source = await loadSource(id);
  const provenance = provenanceUpdate(source, input);
  const fileHash = fileHashOf(file.buffer);
  await assertReplacementFile(source, fileHash);
  const content = await analyzeContent([file], expectedCountOf(source, input.expectedArticleCount));
  const checks = await replacementChecks(source, content, input, file, referenceFile);
  assertOrigin(checks.origin);
  noteDocumentNumber(content, checks.documentNumber, true);
  noteAnchors(content, checks.anchors, true);
  assertCrossReference(checks.crossCheck, input.acknowledgeDifferences);
  const crossNotes = crossCheckWarnings(checks.crossCheck);
  content.parts[0].notes.push(...crossNotes);
  content.coverage.warnings.push(...crossNotes);
  const [read] = content.parts;

  const upload = await storeLegalFile(source._id, file, fileHash);
  let reference: StoredReference | undefined;
  try {
    reference = await storeReferenceFile(
      source._id,
      referenceFile,
      checks.crossCheck,
      input.referenceOrigin,
      input.acknowledgeDifferences,
    );
  } catch (err) {
    await discardLegalFiles([upload.stored]);
    throw err;
  }
  const replacedAt = new Date();
  let changes: Awaited<ReturnType<typeof changesOf>>;
  try {
    changes = await commitContent({
      source,
      content,
      set: {
        ...provenance,
        parts: [partOf(file, read.chunks, upload, { ...read.analyzed, notes: read.notes }, [], reference?.record)],
      },
      push: source.parts.length
        ? { previousParts: { $each: source.parts.map((part) => ({ ...part.toObject(), replacedAt })) } }
        : undefined,
      history: {
        actor,
        action: 'content_replaced',
        details: {
          fileName: file.name,
          fileHash,
          origin: input.origin ?? source.origin,
          crossCheck: checks.crossCheck.result,
          previousFiles: source.parts.map((part) => ({ fileName: part.fileName, fileHash: part.fileHash })),
        },
      },
    });
  } catch (err) {
    await discardLegalFiles([upload.stored, reference?.stored]);
    throw err;
  }
  return finishContent(source._id, changes);
}
