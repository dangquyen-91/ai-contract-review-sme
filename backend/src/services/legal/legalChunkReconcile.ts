import type { LegalChunkDraft, LegalHeading } from './legalDocumentParser.service';
import { embeddingInputOf } from './legalKnowledgeIngest.service';

export interface ExistingLegalChunk {
  id: string;
  order: number;
  chunkText: string;
  articleRef?: string | null;
  articleKey?: string | null;
  hierarchy?: LegalHeading[] | null;
}

export interface ChunkPair {
  id: string;
  draft: LegalChunkDraft;
}

export interface ChunkReconciliation {
  unchanged: ChunkPair[];
  changed: ChunkPair[];
  added: LegalChunkDraft[];
  removed: ExistingLegalChunk[];
}

export interface ChunkChangeSummary {
  unchanged: number;
  changed: number;
  added: number;
  removed: number;
  changedRefs: string[];
  addedRefs: string[];
  removedRefs: string[];
}

const MAX_LISTED_REFS = 50;

interface Slotted<T> {
  key: string;
  item: T;
}

function slotted<T extends { articleRef?: string | null }>(items: T[]): Slotted<T>[] {
  const seen = new Map<string, number>();
  let unstructured = 0;
  return items.map((item) => {
    const ref = item.articleRef ? `ref:${item.articleRef}` : `pos:${unstructured++}`;
    const n = seen.get(ref) ?? 0;
    seen.set(ref, n + 1);
    return { key: `${ref}#${n}`, item };
  });
}

const contentOf = (chunk: { chunkText: string; hierarchy?: LegalHeading[] | null }) =>
  embeddingInputOf('', { chunkText: chunk.chunkText.replace(/\s+/g, ' ').trim(), hierarchy: chunk.hierarchy });

export function reconcileLegalChunks(existing: ExistingLegalChunk[], drafts: LegalChunkDraft[]): ChunkReconciliation {
  const ordered = [...existing].sort((a, b) => a.order - b.order);
  const oldByKey = new Map(slotted(ordered).map(({ key, item }) => [key, item]));
  const pairs: ChunkPair[] = [];
  const matched = new Set<string>();
  const unmatchedDrafts: LegalChunkDraft[] = [];

  for (const { key, item: draft } of slotted(drafts)) {
    const old = oldByKey.get(key);
    if (old && !matched.has(old.id)) {
      matched.add(old.id);
      pairs.push({ id: old.id, draft });
    } else {
      unmatchedDrafts.push(draft);
    }
  }

  const leftoverByArticle = new Map<string, ExistingLegalChunk[]>();
  for (const old of ordered) {
    if (matched.has(old.id) || !old.articleKey) continue;
    const list = leftoverByArticle.get(old.articleKey) ?? [];
    list.push(old);
    leftoverByArticle.set(old.articleKey, list);
  }

  const added: LegalChunkDraft[] = [];
  for (const draft of unmatchedDrafts) {
    const old = draft.articleKey ? leftoverByArticle.get(draft.articleKey)?.shift() : undefined;
    if (old) {
      matched.add(old.id);
      pairs.push({ id: old.id, draft });
    } else {
      added.push(draft);
    }
  }

  const oldById = new Map(ordered.map((chunk) => [chunk.id, chunk]));
  const unchanged: ChunkPair[] = [];
  const changed: ChunkPair[] = [];
  for (const pair of pairs) {
    const old = oldById.get(pair.id)!;
    (contentOf(old) === contentOf(pair.draft) ? unchanged : changed).push(pair);
  }

  return {
    unchanged,
    changed,
    added,
    removed: ordered.filter((chunk) => !matched.has(chunk.id)),
  };
}

const refsOf = (items: { articleRef?: string | null }[]) => {
  const refs = [...new Set(items.map((item) => item.articleRef ?? '(passage without article)'))];
  return refs.length > MAX_LISTED_REFS ? [...refs.slice(0, MAX_LISTED_REFS), `... ${refs.length - MAX_LISTED_REFS} more`] : refs;
};

export function summarizeReconciliation(plan: ChunkReconciliation): ChunkChangeSummary {
  return {
    unchanged: plan.unchanged.length,
    changed: plan.changed.length,
    added: plan.added.length,
    removed: plan.removed.length,
    changedRefs: refsOf(plan.changed.map((pair) => pair.draft)),
    addedRefs: refsOf(plan.added),
    removedRefs: refsOf(plan.removed),
  };
}
