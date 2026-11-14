import { HydratedDocument, Types } from 'mongoose';
import { AppError } from '../../errors/AppError';
import { LegalSource, LegalSourceModel } from '../../models/legalSource.model';
import { LegalKnowledgeChunkModel } from '../../models/legalKnowledgeChunk.model';
import { RiskCitationModel } from '../../models/riskCitation.model';
import { fileHashOf } from '../contract/contractVersion.service';
import { downloadContractFile, storedFileOf } from '../contract/storage.service';
import { buildLegalCoverage, LegalChunkDraft } from './legalDocumentParser.service';
import { AnalyzedLegalText } from './legalKnowledgeIngest.service';
import { analyzeLegalFile, assertFileNotStored, LegalFile, partNotes } from './legalSource.service';
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
    parts.push({ file, analyzed, chunks, skippedArticles });
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
  }));
}

async function previewOf(source: HydratedDocument<LegalSource>, content: AnalyzedContent) {
  const plan = await reconcileWithStored(source._id, content.drafts);
  return {
    documentNumber: content.documentNumber,
    coverage: content.coverage,
    parts: presentAnalyzedParts(content),
    changes: await changesOf(plan),
  };
}

const expectedCountOf = (source: HydratedDocument<LegalSource>, expectedArticleCount?: number) =>
  expectedArticleCount ?? source.coverage?.expectedArticleCount ?? undefined;

export async function previewReparse(id: string, expectedArticleCount?: number) {
  const source = await loadSource(id);
  const files = await loadStoredPartFiles(source);
  return previewOf(source, await analyzeContent(files, expectedCountOf(source, expectedArticleCount)));
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

export async function previewContentReplacement(id: string, file: LegalFile, expectedArticleCount?: number) {
  const source = await loadSource(id);
  await assertReplacementFile(source, fileHashOf(file.buffer));
  return previewOf(source, await analyzeContent([file], expectedCountOf(source, expectedArticleCount)));
}
