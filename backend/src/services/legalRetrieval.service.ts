import { LegalKnowledgeChunkModel, EMBEDDING_DIMENSIONS } from '../models/legalKnowledgeChunk.model';
import { LegalSourceModel } from '../models/legalSource.model';
import { logger } from '../config/logger';
import { embedText } from './llm.service';
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

export async function searchLegalChunks(queryText: string, topK: number): Promise<LegalChunkMatch[]> {
  try {
    const queryVector = await embedText(queryText, EMBEDDING_DIMENSIONS);

    const results = await LegalKnowledgeChunkModel.aggregate<VectorSearchResult>([
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

    if (results.length === 0) return [];

    const sourceIds = [...new Set(results.map((r) => String(r.legalSourceId)))];
    const sources = await LegalSourceModel.find({ _id: { $in: sourceIds } });
    const sourceById = new Map(sources.map((s) => [s._id.toString(), s]));

    return results.map((r) => {
      const source = sourceById.get(String(r.legalSourceId));
      return {
        chunkId: String(r._id),
        chunkText: r.chunkText,
        articleRef: r.articleRef,
        citationLabel: source?.citationLabel ?? 'Unknown',
        sourceTitle: source?.title ?? 'Unknown',
        score: r.score,
      };
    });
  } catch (err) {
    logger.warn('Legal chunk vector search failed, continuing without citations', err);
    return [];
  }
}
