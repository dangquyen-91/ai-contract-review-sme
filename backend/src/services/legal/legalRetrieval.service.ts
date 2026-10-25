import { Types } from 'mongoose';
import { LegalKnowledgeChunkModel, EMBEDDING_DIMENSIONS } from '../../models/legalKnowledgeChunk.model';
import { LegalSourceModel } from '../../models/legalSource.model';
import { LEGAL_BASIS_VERIFICATIONS } from '../../models/riskFinding.model';
import { LEGAL_RETRIEVAL_STATUSES } from '../../models/contractVersion.model';
import { logger } from '../../config/logger';
import { embedTexts } from '../ai/llm.service';
import { LEGAL_CHUNK_TEXT_INDEX_NAME, LEGAL_CHUNK_VECTOR_INDEX_NAME } from './legalKnowledgeIngest.service';
import { LEGAL_SOURCE_CATALOG } from './legalSourceCatalog.data';

export type LegalRetriever = 'vector' | 'text';

export interface LegalChunkMatch {
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

export interface LegalSearchResult {
  matches: LegalChunkMatch[][];
  status: LegalRetrievalStatus;
}

const SEARCHABLE_SOURCE = { status: { $ne: 'repealed' } };
const RRF_K = 60;
const MAX_TEXT_QUERY_CHARS = 1500;
const HIT_PROJECTION = { chunkText: 1, articleRef: 1, articleNumber: 1, legalSourceId: 1 };

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

function vectorSearch(queryVector: number[], limit: number, legalSourceIds: Types.ObjectId[]) {
  return LegalKnowledgeChunkModel.aggregate<ChunkHit>([
    {
      $vectorSearch: {
        index: LEGAL_CHUNK_VECTOR_INDEX_NAME,
        path: 'embedding',
        queryVector,
        numCandidates: Math.max(limit * 20, 100),
        limit,
        filter: { legalSourceId: { $in: legalSourceIds } },
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

  try {
    const legalSourceIds = await resolveLegalSearchScope(legalSourceCodes);
    if (legalSourceIds.length === 0) return { matches: queryTexts.map(() => []), status: 'no_sources' };

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
          score,
          retrievers,
        };
      }),
    );
    return { matches, status };
  } catch (err) {
    if (signal?.aborted) throw err;
    logger.warn('Legal chunk search failed, continuing without citations', {
      error: err instanceof Error ? err.message : String(err),
      queryCount: queryTexts.length,
    });
    return { matches: queryTexts.map(() => []), status: 'unavailable' };
  }
}

export type LegalBasisVerification = (typeof LEGAL_BASIS_VERIFICATIONS)[number];

export interface LegalBasisToVerify {
  text: string;
  chunkIds: string[];
}

export interface VerifiedLegalBasis {
  text: string;
  legalKnowledgeChunkIds: string[];
  verification: LegalBasisVerification;
}

interface LawName {
  name: string;
  year?: string;
  code?: string;
  sourceId?: string;
}

interface ArticleMention {
  start: number;
  end: number;
  article: number;
  clause?: number;
}

interface StoredChunk {
  _id: Types.ObjectId;
  legalSourceId: Types.ObjectId;
  articleNumber?: number | null;
  clauseFrom?: number | null;
  clauseTo?: number | null;
  order: number;
}

const LAW_ABBREVIATIONS: Record<string, string> = {
  blds: 'civil_code_2015',
  'bllđ': 'labor_code_2019',
  blld: 'labor_code_2019',
  ltm: 'commercial_law_2005',
};

const normalizeText = (value: string) => value.normalize('NFC').toLowerCase().replace(/\s+/g, ' ');

function splitLawName(value: string): { name: string; year?: string } {
  const normalized = normalizeText(value).trim();
  const match = normalized.match(/^(.*?)\s+(?:năm\s+)?(\d{4})$/u);
  return match ? { name: match[1], year: match[2] } : { name: normalized };
}

const ARTICLE_MENTION_RE = /(?:khoản\s+(\d{1,3})\s+)?điều\s+(\d{1,4})[a-zđ]?(?![\d])(?:\s*,?\s*khoản\s+(\d{1,3}))?/gu;

function findArticleMentions(text: string): ArticleMention[] {
  return [...text.matchAll(ARTICLE_MENTION_RE)].map((m) => ({
    start: m.index ?? 0,
    end: (m.index ?? 0) + m[0].length,
    article: Number(m[2]),
    clause: m[1] ? Number(m[1]) : m[3] ? Number(m[3]) : undefined,
  }));
}

function findLawMentions(text: string, laws: LawName[]) {
  const taken: { start: number; end: number; law?: LawName }[] = [];
  const sorted = [...laws].sort((a, b) => b.name.length - a.name.length);
  for (const law of sorted) {
    let from = 0;
    for (;;) {
      const start = text.indexOf(law.name, from);
      if (start < 0) break;
      const end = start + law.name.length;
      from = end;
      if (/[\p{L}\d]/u.test(text[start - 1] ?? '') || /[\p{L}\d]/u.test(text[end] ?? '')) continue;
      if (taken.some((t) => start < t.end && end > t.start)) continue;
      const yearMatch = text.slice(end).match(/^\s*(?:năm\s+)?(\d{4})/u);
      const sameLaw = !yearMatch || !law.year || yearMatch[1] === law.year;
      taken.push({ start, end, law: sameLaw ? law : undefined });
    }
  }
  return taken.sort((a, b) => a.start - b.start);
}

async function loadLawNames(): Promise<LawName[]> {
  const sources = await LegalSourceModel.find(SEARCHABLE_SOURCE).select('code title citationLabel');
  const sourceIdByCode = new Map(sources.map((s) => [s.code, String(s._id)]));
  const names: LawName[] = [];
  const add = (label: string, code: string | undefined, sourceId: string | undefined) => {
    const { name, year } = splitLawName(label);
    if (name.length >= 3 && !names.some((n) => n.name === name && n.year === year)) names.push({ name, year, code, sourceId });
  };
  for (const s of sources) {
    add(s.title, s.code, String(s._id));
    add(s.citationLabel, s.code, String(s._id));
  }
  for (const [code, label] of Object.entries(LEGAL_SOURCE_CATALOG)) add(label, code, sourceIdByCode.get(code));
  for (const [abbr, code] of Object.entries(LAW_ABBREVIATIONS)) {
    const label = LEGAL_SOURCE_CATALOG[code as keyof typeof LEGAL_SOURCE_CATALOG];
    names.push({ name: abbr, year: label ? splitLawName(label).year : undefined, code, sourceId: sourceIdByCode.get(code) });
  }
  return names;
}

const clauseFits = (chunk: StoredChunk, clause?: number) =>
  clause === undefined || chunk.clauseFrom == null || (chunk.clauseFrom <= clause && (chunk.clauseTo ?? chunk.clauseFrom) >= clause);

export async function verifyLegalBasis(items: LegalBasisToVerify[]): Promise<VerifiedLegalBasis[]> {
  if (items.length === 0) return [];
  const laws = await loadLawNames();

  const parsed = items.map((item) => {
    const text = normalizeText(item.text);
    const lawMentions = findLawMentions(text, laws);
    const mentions = findArticleMentions(text).map((mention) => {
      const after = lawMentions.find((l) => l.start >= mention.end);
      const before = [...lawMentions].reverse().find((l) => l.end <= mention.start);
      const named = after ?? before;
      return { ...mention, named: Boolean(named), law: named?.law };
    });
    return { item, mentions };
  });

  const citedIds = [...new Set(items.flatMap((i) => i.chunkIds))];
  const wanted = parsed.flatMap((p) =>
    p.mentions.flatMap((m) => (m.law?.sourceId ? [{ legalSourceId: new Types.ObjectId(m.law.sourceId), articleNumber: m.article }] : [])),
  );
  const conditions = [...(citedIds.length ? [{ _id: { $in: citedIds } }] : []), ...wanted];
  const chunks = conditions.length
    ? ((await LegalKnowledgeChunkModel.find({ $or: conditions })
        .select('legalSourceId articleNumber clauseFrom clauseTo order')
        .lean()) as unknown as StoredChunk[])
    : [];
  const chunkById = new Map(chunks.map((c) => [String(c._id), c]));

  return parsed.map(({ item, mentions }) => {
    const cited = item.chunkIds.flatMap((id) => chunkById.get(id) ?? []);
    if (mentions.length === 0) {
      return { text: item.text, legalKnowledgeChunkIds: cited.map((c) => String(c._id)), verification: 'unreferenced' as const };
    }

    const defaultSourceId = cited.length ? String(cited[0].legalSourceId) : undefined;
    const linked = new Set<string>();
    let resolved = 0;
    let missingArticle = false;
    for (const mention of mentions) {
      const sourceId = mention.law?.sourceId ?? (mention.named ? undefined : defaultSourceId);
      if (!sourceId) continue;
      const matchesMention = (c: StoredChunk) =>
        String(c.legalSourceId) === sourceId && c.articleNumber === mention.article && clauseFits(c, mention.clause);
      const fromCited = cited.find(matchesMention);
      const fromArticle = chunks
        .filter(matchesMention)
        .sort((a, b) => a.order - b.order)[0];
      const chosen = fromCited ?? fromArticle;
      if (chosen) {
        linked.add(String(chosen._id));
        resolved++;
      } else {
        missingArticle = true;
      }
    }

    const verification: LegalBasisVerification =
      resolved === mentions.length
        ? 'verified'
        : resolved > 0
          ? 'partially_verified'
          : missingArticle
            ? 'article_not_found'
            : 'not_in_knowledge_base';
    return { text: item.text, legalKnowledgeChunkIds: [...linked], verification };
  });
}
