import { Type } from '@google/genai';
import { z } from 'zod';
import { CLAUSE_CATEGORIES } from '../models/clauseTypeTaxonomy.model';
import { AppError } from '../errors/AppError';
import { logger } from '../config/logger';
import { ArticleSpan, splitByArticleHeadings, splitByStartMarkers } from '../utils/clauseOffsets';
import { generateJson } from './llm.service';

type ClauseCategory = (typeof CLAUSE_CATEGORIES)[number];

export interface SegmentedClause {
  index: number;
  title?: string;
  text: string;
  startOffset: number;
  endOffset: number;
  category: ClauseCategory;
  summary: string;
}

const CATEGORY_RULE = `"category" must be exactly one of: ${CLAUSE_CATEGORIES.join(', ')}. Use "other" if nothing fits (including the contract title, preamble and party details).`;
const SUMMARY_RULE = `"summary" must be a short (1-3 sentences) plain-language explanation written in Vietnamese with full diacritics, understandable to someone with no legal background.`;

const sectionResultSchema = z.object({
  sections: z.array(
    z.object({
      sectionId: z.number().int(),
      category: z.enum(CLAUSE_CATEGORIES),
      summary: z.string().min(1),
    }),
  ),
});

const sectionResponseSchema = {
  type: Type.OBJECT,
  properties: {
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sectionId: { type: Type.INTEGER },
          category: { type: Type.STRING, enum: [...CLAUSE_CATEGORIES] },
          summary: { type: Type.STRING },
        },
        required: ['sectionId', 'category', 'summary'],
      },
    },
  },
  required: ['sections'],
};

const SECTIONS_PER_CALL = 20;
const MAX_PARALLEL_CALLS = 4;

type SectionResult = z.infer<typeof sectionResultSchema>['sections'][number];

function buildSectionPrompt(sections: { id: number; text: string }[]): string {
  const sectionBlock = sections.map(({ id, text }) => `[section ${id}]\n${text}`).join('\n\n');
  return `You are a legal contract analyst reviewing a Vietnamese contract that has already been split into numbered sections.

For EVERY section below return one item with its "sectionId", a "category" and a "summary".
- ${CATEGORY_RULE}
- ${SUMMARY_RULE}

Sections:
"""
${sectionBlock}
"""`;
}

async function classifyBatch(sections: { id: number; text: string }[]): Promise<SectionResult[]> {
  const raw = await generateJson(buildSectionPrompt(sections), sectionResponseSchema);
  const parsed = sectionResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw AppError.internal('LLM returned an unexpected clause classification format.');
  }
  const ids = new Set(sections.map((s) => s.id));
  return parsed.data.sections.filter((s) => ids.has(s.sectionId));
}

async function classifySections(sections: { id: number; text: string }[]) {
  const byId = new Map<number, SectionResult>();
  const batches: { id: number; text: string }[][] = [];
  for (let i = 0; i < sections.length; i += SECTIONS_PER_CALL) {
    batches.push(sections.slice(i, i + SECTIONS_PER_CALL));
  }
  for (let i = 0; i < batches.length; i += MAX_PARALLEL_CALLS) {
    const results = await Promise.all(batches.slice(i, i + MAX_PARALLEL_CALLS).map(classifyBatch));
    for (const result of results.flat()) byId.set(result.sectionId, result);
  }
  return byId;
}

async function classifyArticles(
  contractText: string,
  articles: ArticleSpan[],
): Promise<SegmentedClause[]> {
  const texts = articles.map((a) => contractText.slice(a.startOffset, a.endOffset));
  const sections = texts.map((text, id) => ({ id, text }));

  const byId = await classifySections(sections);
  const skipped = sections.filter((s) => !byId.has(s.id));
  if (skipped.length > 0) {
    for (const [id, result] of await classifySections(skipped)) byId.set(id, result);
  }

  const missing = sections.filter((s) => !byId.has(s.id)).length;
  if (missing > 0) {
    logger.warn('LLM skipped some contract sections; using fallback category/summary', {
      sections: articles.length,
      missing,
    });
  }

  return articles.map((article, index) => {
    const result = byId.get(index);
    return {
      index,
      title: article.title,
      text: texts[index],
      startOffset: article.startOffset,
      endOffset: article.endOffset,
      category: result?.category ?? 'other',
      summary: result?.summary ?? 'Chưa thể tóm tắt tự động phần này của hợp đồng.',
    };
  });
}

const markerResultSchema = z.object({
  clauses: z.array(
    z.object({
      title: z.string().nullable().optional(),
      startMarker: z.string().min(1),
      category: z.enum(CLAUSE_CATEGORIES),
      summary: z.string().min(1),
    }),
  ),
});

const markerResponseSchema = {
  type: Type.OBJECT,
  properties: {
    clauses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, nullable: true },
          startMarker: { type: Type.STRING },
          category: { type: Type.STRING, enum: [...CLAUSE_CATEGORIES] },
          summary: { type: Type.STRING },
        },
        required: ['startMarker', 'category', 'summary'],
      },
    },
  },
  required: ['clauses'],
};

function buildMarkerPrompt(contractText: string): string {
  return `You are a legal contract analyst reviewing a Vietnamese contract.

Split the contract text below into individual clauses and classify each one. Do NOT copy the clause text. Instead, mark where each clause begins:
- "startMarker" is the first 8-15 words of the clause (including its heading if it has one), copied EXACTLY character-for-character from the contract text below. Do not paraphrase, translate, fix typos, change punctuation or add/remove diacritics. It must be long enough to be unique in the contract.
- A clause runs from its startMarker up to the next clause's startMarker, so together the clauses must cover the whole contract, in the order they appear, without skipping any part.
- The first clause starts at the very beginning of the contract.
- "title" is the clause heading if the contract has one, otherwise omit it.
- ${CATEGORY_RULE}
- ${SUMMARY_RULE}
- If the text has no clear clause structure, use your best judgement to split it into logically distinct provisions.

Contract text:
"""
${contractText}
"""`;
}

async function segmentByMarkers(contractText: string): Promise<SegmentedClause[]> {
  const raw = await generateJson(buildMarkerPrompt(contractText), markerResponseSchema);

  const parsed = markerResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw AppError.internal('LLM returned an unexpected clause segmentation format.');
  }

  const llmClauses = parsed.data.clauses;
  const spans = splitByStartMarkers(
    contractText,
    llmClauses.map((c) => c.startMarker),
  );
  if (spans.length === 0) {
    throw AppError.internal('Could not locate any clause boundaries in the contract text.');
  }
  if (spans.length < llmClauses.length) {
    logger.warn('Some clause start markers were not found and were merged into the previous clause', {
      returned: llmClauses.length,
      located: spans.length,
    });
  }

  return spans.map((span, index) => {
    const clause = llmClauses[span.markerIndex];
    return {
      index,
      title: clause.title ?? undefined,
      text: contractText.slice(span.startOffset, span.endOffset),
      startOffset: span.startOffset,
      endOffset: span.endOffset,
      category: clause.category,
      summary: clause.summary,
    };
  });
}

export async function segmentContractClauses(contractText: string): Promise<SegmentedClause[]> {
  const articles = splitByArticleHeadings(contractText);
  return articles ? classifyArticles(contractText, articles) : segmentByMarkers(contractText);
}
