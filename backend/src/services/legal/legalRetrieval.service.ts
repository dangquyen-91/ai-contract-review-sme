import { Types } from 'mongoose';
import { LegalKnowledgeChunkModel, EMBEDDING_DIMENSIONS } from '../../models/legalKnowledgeChunk.model';
import { LegalSourceModel } from '../../models/legalSource.model';
import { logger } from '../../config/logger';
import { embedTexts } from '../ai/llm.service';
import {
  CURRENT_EMBEDDING,
  LEGAL_CHUNK_TEXT_INDEX_NAME,
  LEGAL_CHUNK_VECTOR_INDEX_NAME,
} from './legalKnowledgeIngest.service';
import { inForceSourceFilter, LegalSourceReference, sourceReferenceOf } from './legalSourceAvailability';

export const LEGAL_RETRIEVAL_STATUSES = ['ok', 'degraded', 'no_sources', 'unavailable'] as const;

export const LEGAL_SEARCH_SCOPES = ['profile', 'partial', 'all_sources', 'none'] as const;

export type LegalRetriever = 'vector' | 'text';

export interface LegalChunkMatch extends Omit<LegalSourceReference, 'legalSourceId'> {
  chunkId: string;
  chunkText: string;
  articleRef?: string;
  articleNumber?: number;
  legalSourceId: string;
  citationLabel: string;
  sourceTitle: string;
  score: number;
  retrievers: LegalRetriever[];
}

interface ChunkHit {
  _id: unknown;
  chunkText: string;
  articleRef?: string;
  articleNumber?: number;
  legalSourceId: unknown;
}

export interface LegalSearchOptions {
  legalSourceCodes?: string[];
  signal?: AbortSignal;
}

export type LegalRetrievalStatus = (typeof LEGAL_RETRIEVAL_STATUSES)[number];

export type LegalSearchScope = (typeof LEGAL_SEARCH_SCOPES)[number];

export interface LegalSearchScopeResult {
  ids: Types.ObjectId[];
  scope: LegalSearchScope;
  missingSources: string[];
}

export interface LegalSearchResult {
  matches: LegalChunkMatch[][];
  status: LegalRetrievalStatus;
  scope?: LegalSearchScope;
  missingSources?: string[];
}

const RRF_K = 60;
const MAX_TEXT_QUERY_CHARS = 1500;
const HIT_PROJECTION = { chunkText: 1, articleRef: 1, articleNumber: 1, legalSourceId: 1 };

export async function resolveLegalSearchScope(legalSourceCodes: string[] = []): Promise<LegalSearchScopeResult> {
  let missingSources: string[] = [];
  if (legalSourceCodes.length > 0) {
    const preferred = await LegalSourceModel.find({
      $and: [inForceSourceFilter(), { code: { $in: legalSourceCodes } }],
    }).select('code');
    const found = new Set(preferred.map((s) => s.code));
    missingSources = legalSourceCodes.filter((code) => !found.has(code));
    if (preferred.length > 0) {
      if (missingSources.length) {
        logger.info('Some governing laws are not in force in the legal knowledge base', { missing: missingSources });
      }
      return {
        ids: preferred.map((s) => s._id),
        scope: missingSources.length ? 'partial' : 'profile',
        missingSources,
      };
    }
    logger.warn('None of the governing laws is in force in the legal knowledge base; searching every legal source', {
      legalSourceCodes,
    });
  }
  const ids = (await LegalSourceModel.find(inForceSourceFilter()).select('_id')).map((s) => s._id);
  return { ids, scope: ids.length ? 'all_sources' : 'none', missingSources };
}

function vectorSearch(queryVector: number[], limit: number, legalSourceIds: Types.ObjectId[]) {
  return LegalKnowledgeChunkModel.aggregate<ChunkHit>([
    {
      $vectorSearch: {
        index: LEGAL_CHUNK_VECTOR_INDEX_NAME,
        path: 'embedding',
        queryVector,
        numCandidates: Math.max(limit * 20, 100),
        limit,
        filter: { legalSourceId: { $in: legalSourceIds }, ...CURRENT_EMBEDDING },
      },
    },
    { $project: HIT_PROJECTION },
  ]);
}

function textSearch(query: string, limit: number, legalSourceIds: Types.ObjectId[]) {
  return LegalKnowledgeChunkModel.aggregate<ChunkHit>([
    {
      $search: {
        index: LEGAL_CHUNK_TEXT_INDEX_NAME,
        compound: {
          must: [{ text: { query: query.slice(0, MAX_TEXT_QUERY_CHARS), path: ['chunkText', 'articleTitle'] } }],
          filter: [{ in: { path: 'legalSourceId', value: legalSourceIds } }],
        },
      },
    },
    { $limit: limit },
    { $project: HIT_PROJECTION },
  ]);
}

function fuseByReciprocalRank(lists: { retriever: LegalRetriever; hits: ChunkHit[] }[], topK: number) {
  const fused = new Map<string, { hit: ChunkHit; score: number; retrievers: LegalRetriever[] }>();
  for (const { retriever, hits } of lists) {
    hits.forEach((hit, rank) => {
      const id = String(hit._id);
      const entry = fused.get(id) ?? { hit, score: 0, retrievers: [] };
      entry.score += 1 / (RRF_K + rank + 1);
      entry.retrievers.push(retriever);
      fused.set(id, entry);
    });
  }
  const bestPossible = lists.length / (RRF_K + 1);
  return [...fused.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((entry) => ({ ...entry, score: entry.score / bestPossible }));
}

export async function searchLegalChunks(
  queryTexts: string[],
  topKPerQuery: number,
  { legalSourceCodes, signal }: LegalSearchOptions = {},
): Promise<LegalSearchResult> {
  if (queryTexts.length === 0) return { matches: [], status: 'ok' };

  let resolved: LegalSearchScopeResult | undefined;
  try {
    resolved = await resolveLegalSearchScope(legalSourceCodes);
    const { ids: legalSourceIds, scope, missingSources } = resolved;
    if (legalSourceIds.length === 0) {
      return { matches: queryTexts.map(() => []), status: 'no_sources', scope, missingSources };
    }

    const candidates = Math.max(topKPerQuery * 4, 10);
    const [vectors, textResults] = await Promise.allSettled([
      embedTexts(queryTexts, { taskType: 'RETRIEVAL_QUERY', outputDimensionality: EMBEDDING_DIMENSIONS, signal }).then(
        (queryVectors) => Promise.all(queryVectors.map((v) => vectorSearch(v, candidates, legalSourceIds))),
      ),
      Promise.all(queryTexts.map((q) => textSearch(q, candidates, legalSourceIds))),
    ]);
    signal?.throwIfAborted();
    if (vectors.status === 'rejected' && textResults.status === 'rejected') throw vectors.reason;
    for (const [retriever, result] of [['vector', vectors], ['text', textResults]] as const) {
      if (result.status === 'rejected') {
        logger.warn(`Legal ${retriever} search failed, using the other retriever only`, {
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    }

    const fusedPerQuery = queryTexts.map((_, i) =>
      fuseByReciprocalRank(
        [
          ...(vectors.status === 'fulfilled' ? [{ retriever: 'vector' as const, hits: vectors.value[i] }] : []),
          ...(textResults.status === 'fulfilled' ? [{ retriever: 'text' as const, hits: textResults.value[i] }] : []),
        ],
        topKPerQuery,
      ),
    );

    const sourceIds = [...new Set(fusedPerQuery.flat().map((r) => String(r.hit.legalSourceId)))];
    const sources = sourceIds.length ? await LegalSourceModel.find({ _id: { $in: sourceIds } }) : [];
    const sourceById = new Map(sources.map((s) => [s._id.toString(), s]));

    const status: LegalRetrievalStatus =
      vectors.status === 'fulfilled' && textResults.status === 'fulfilled' ? 'ok' : 'degraded';
    const matches = fusedPerQuery.map((results) =>
      results.map(({ hit, score, retrievers }) => {
        const source = sourceById.get(String(hit.legalSourceId));
        return {
          chunkId: String(hit._id),
          chunkText: hit.chunkText,
          articleRef: hit.articleRef,
          articleNumber: hit.articleNumber,
          legalSourceId: String(hit.legalSourceId),
          citationLabel: source?.citationLabel ?? 'Unknown',
          sourceTitle: source?.title ?? 'Unknown',
          ...sourceReferenceOf(source),
          score,
          retrievers,
        };
      }),
    );
    return { matches, status, scope, missingSources };
  } catch (err) {
    if (signal?.aborted) throw err;
    logger.warn('Legal chunk search failed, continuing without citations', {
      error: err instanceof Error ? err.message : String(err),
      queryCount: queryTexts.length,
    });
    return {
      matches: queryTexts.map(() => []),
      status: 'unavailable',
      ...(resolved ? { scope: resolved.scope, missingSources: resolved.missingSources } : {}),
    };
  }
}
