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

async function vectorSearch(queryVector: number[], topK: number) {
  return LegalKnowledgeChunkModel.aggregate<VectorSearchResult>([
    {
      $vectorSearch: {
        index: LEGAL_CHUNK_VECTOR_INDEX_NAME,
        path: 'embedding',
        queryVector,
        numCandidates: Math.max(topK * 20, 100),
        limit: topK,
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
  signal?: AbortSignal,
): Promise<LegalChunkMatch[][]> {
  if (queryTexts.length === 0) return [];

  try {
    const queryVectors = await embedTexts(queryTexts, {
      taskType: 'RETRIEVAL_QUERY',
      outputDimensionality: EMBEDDING_DIMENSIONS,
      signal,
    });
    const resultsPerQuery = await Promise.all(
      queryVectors.map((vector) => vectorSearch(vector, topKPerQuery)),
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
