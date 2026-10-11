import { Types } from 'mongoose';
import { LegalKnowledgeChunkModel, EMBEDDING_DIMENSIONS } from '../models/legalKnowledgeChunk.model';
import { LegalSourceModel } from '../models/legalSource.model';
import { logger } from '../config/logger';
import { embedTexts } from './llm.service';
import { LEGAL_CHUNK_VECTOR_INDEX_NAME } from './legalKnowledgeIngest.service';

export interface LegalChunkMatch {
  chunkId: string;
  chunkText: string;
  articleRef?: string;
  citationLabel: string;
  sourceTitle: string;
  score: number;
}

interface VectorSearchResult {
  _id: unknown;
  chunkText: string;
  articleRef?: string;
  legalSourceId: unknown;
  score: number;
}

export interface LegalSearchOptions {
  legalSourceCodes?: string[];
  signal?: AbortSignal;
}

const SEARCHABLE_SOURCE = { status: { $ne: 'repealed' } };

export async function resolveLegalSearchScope(legalSourceCodes: string[] = []): Promise<Types.ObjectId[]> {
  if (legalSourceCodes.length > 0) {
    const preferred = await LegalSourceModel.find({ ...SEARCHABLE_SOURCE, code: { $in: legalSourceCodes } }).select('code');
    if (preferred.length > 0) {
      const found = new Set(preferred.map((s) => s.code));
      const missing = legalSourceCodes.filter((code) => !found.has(code));
      if (missing.length) logger.info('Some governing laws are not in the legal knowledge base yet', { missing });
      return preferred.map((s) => s._id);
    }
    logger.warn('None of the governing laws are in the legal knowledge base; searching every legal source', {
      legalSourceCodes,
    });
  }
  return (await LegalSourceModel.find(SEARCHABLE_SOURCE).select('_id')).map((s) => s._id);
}

async function vectorSearch(queryVector: number[], topK: number, legalSourceIds: Types.ObjectId[]) {
  return LegalKnowledgeChunkModel.aggregate<VectorSearchResult>([
    {
      $vectorSearch: {
        index: LEGAL_CHUNK_VECTOR_INDEX_NAME,
        path: 'embedding',
        queryVector,
        numCandidates: Math.max(topK * 20, 100),
        limit: topK,
        filter: { legalSourceId: { $in: legalSourceIds } },
      },
    },
    {
      $project: {
        chunkText: 1,
        articleRef: 1,
        legalSourceId: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ]);
}

export async function searchLegalChunks(
  queryTexts: string[],
  topKPerQuery: number,
  { legalSourceCodes, signal }: LegalSearchOptions = {},
): Promise<LegalChunkMatch[][]> {
  if (queryTexts.length === 0) return [];

  try {
    const legalSourceIds = await resolveLegalSearchScope(legalSourceCodes);
    if (legalSourceIds.length === 0) return queryTexts.map(() => []);

    const queryVectors = await embedTexts(queryTexts, {
      taskType: 'RETRIEVAL_QUERY',
      outputDimensionality: EMBEDDING_DIMENSIONS,
      signal,
    });
    const resultsPerQuery = await Promise.all(
      queryVectors.map((vector) => vectorSearch(vector, topKPerQuery, legalSourceIds)),
    );

    const sourceIds = [
      ...new Set(resultsPerQuery.flat().map((r) => String(r.legalSourceId))),
    ];
    const sources = sourceIds.length
      ? await LegalSourceModel.find({ _id: { $in: sourceIds } })
      : [];
    const sourceById = new Map(sources.map((s) => [s._id.toString(), s]));

    return resultsPerQuery.map((results) =>
      results.map((r) => {
        const source = sourceById.get(String(r.legalSourceId));
        return {
          chunkId: String(r._id),
          chunkText: r.chunkText,
          articleRef: r.articleRef,
          citationLabel: source?.citationLabel ?? 'Unknown',
          sourceTitle: source?.title ?? 'Unknown',
          score: r.score,
        };
      }),
    );
  } catch (err) {
    if (signal?.aborted) throw err;
    logger.warn('Legal chunk vector search failed, continuing without citations', {
      error: err instanceof Error ? err.message : String(err),
      queryCount: queryTexts.length,
    });
    return queryTexts.map(() => []);
  }
}
