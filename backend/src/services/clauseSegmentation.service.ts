import { Type } from '@google/genai';
import { z } from 'zod';
import { ClauseCategory } from '../models/clauseTypeTaxonomy.model';
import { AppError } from '../errors/AppError';
import { logger } from '../config/logger';
import { ArticleSpan, splitByArticleHeadings, splitByStartMarkers } from '../utils/clauseOffsets';
import { generateJson } from './llm.service';
import { placeholderInstruction, Redactor } from './redaction.service';

export interface SegmentedClause {
  index: number;
  title?: string;
  text: string;
  startOffset: number;
  endOffset: number;
  category: ClauseCategory;
  summary: string;
}

export interface CategoryOption {
  code: ClauseCategory;
  name: string;
  description: string;
}

export interface SegmentationOptions {
  contractLabel: string;
  categories: CategoryOption[];
  redactor: Redactor;
}

interface ClassificationSpec {
  contractLabel: string;
  categoryRule: string;
  categoryCodes: [ClauseCategory, ...ClauseCategory[]];
  redactor: Redactor;
}

const SUMMARY_RULE = `"summary" must be a short (1-3 sentences) plain-language explanation written in Vietnamese with full diacritics, understandable to someone with no legal background.`;

function buildSpec({ contractLabel, categories, redactor }: SegmentationOptions): ClassificationSpec {
  if (!categories.some((c) => c.code === 'other')) {
    throw AppError.internal('Clause categories must include "other".');
  }
  const categoryList = categories.map((c) => `  - ${c.code}: ${c.name} (${c.description})`).join('\n');
  return {
    contractLabel,
    categoryRule: `"category" must be exactly one of the codes below. Use "other" if nothing fits (including the contract title, preamble and party details).\n${categoryList}`,
    categoryCodes: categories.map((c) => c.code) as [ClauseCategory, ...ClauseCategory[]],
    redactor,
  };
}

function sectionSchemas(spec: ClassificationSpec) {
  return {
    result: z.object({
      sections: z.array(
        z.object({
          sectionId: z.number().int(),
          category: z.enum(spec.categoryCodes),
          summary: z.string().min(1),
        }),
      ),
    }),
    response: {
      type: Type.OBJECT,
      properties: {
        sections: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sectionId: { type: Type.INTEGER },
              category: { type: Type.STRING, enum: [...spec.categoryCodes] },
              summary: { type: Type.STRING },
            },
            required: ['sectionId', 'category', 'summary'],
          },
        },
      },
      required: ['sections'],
    },
  };
}

const SECTIONS_PER_CALL = 20;
const MAX_PARALLEL_CALLS = 4;

interface SectionResult {
  sectionId: number;
  category: ClauseCategory;
  summary: string;
}

function buildSectionPrompt(spec: ClassificationSpec, sections: { id: number; text: string }[]): string {
  const sectionBlock = sections.map(({ id, text }) => `[section ${id}]\n${text}`).join('\n\n');
  return `You are a legal contract analyst reviewing a Vietnamese ${spec.contractLabel} that has already been split into numbered sections.

For EVERY section below return one item with its "sectionId", a "category" and a "summary".
- ${spec.categoryRule}
- ${SUMMARY_RULE}${placeholderInstruction(spec.redactor)}

Sections:
"""
${sectionBlock}
"""`;
}

async function classifyBatch(
  spec: ClassificationSpec,
  sections: { id: number; text: string }[],
): Promise<SectionResult[]> {
  const schemas = sectionSchemas(spec);
  const raw = await generateJson(buildSectionPrompt(spec, sections), schemas.response);
  const parsed = schemas.result.safeParse(raw);
  if (!parsed.success) {
    throw AppError.internal('LLM returned an unexpected clause classification format.');
  }
  const ids = new Set(sections.map((s) => s.id));
  return parsed.data.sections.filter((s) => ids.has(s.sectionId));
}

async function classifySections(spec: ClassificationSpec, sections: { id: number; text: string }[]) {
  const byId = new Map<number, SectionResult>();
  const batches: { id: number; text: string }[][] = [];
  for (let i = 0; i < sections.length; i += SECTIONS_PER_CALL) {
    batches.push(sections.slice(i, i + SECTIONS_PER_CALL));
  }
  for (let i = 0; i < batches.length; i += MAX_PARALLEL_CALLS) {
    const results = await Promise.all(
      batches.slice(i, i + MAX_PARALLEL_CALLS).map((batch) => classifyBatch(spec, batch)),
    );
    for (const result of results.flat()) byId.set(result.sectionId, result);
  }
  return byId;
}

async function classifyArticles(
  spec: ClassificationSpec,
  contractText: string,
  articles: ArticleSpan[],
): Promise<SegmentedClause[]> {
  const texts = articles.map((a) => contractText.slice(a.startOffset, a.endOffset));
  const sections = texts.map((text, id) => ({ id, text: spec.redactor.mask(text) }));

  const byId = await classifySections(spec, sections);
  const skipped = sections.filter((s) => !byId.has(s.id));
  if (skipped.length > 0) {
    for (const [id, result] of await classifySections(spec, skipped)) byId.set(id, result);
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
      summary: result
        ? spec.redactor.unmask(result.summary)
        : 'Chưa thể tóm tắt tự động phần này của hợp đồng.',
    };
  });
}

function markerSchemas(spec: ClassificationSpec) {
  return {
    result: z.object({
      clauses: z.array(
        z.object({
          title: z.string().nullable().optional(),
          startMarker: z.string().min(1),
          category: z.enum(spec.categoryCodes),
          summary: z.string().min(1),
        }),
      ),
    }),
    response: {
      type: Type.OBJECT,
      properties: {
        clauses: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, nullable: true },
              startMarker: { type: Type.STRING },
              category: { type: Type.STRING, enum: [...spec.categoryCodes] },
              summary: { type: Type.STRING },
            },
            required: ['startMarker', 'category', 'summary'],
          },
        },
      },
      required: ['clauses'],
    },
  };
}

function buildMarkerPrompt(spec: ClassificationSpec, contractText: string): string {
  return `You are a legal contract analyst reviewing a Vietnamese ${spec.contractLabel}.

Split the contract text below into individual clauses and classify each one. Do NOT copy the clause text. Instead, mark where each clause begins:
- "startMarker" is the first 8-15 words of the clause (including its heading if it has one), copied EXACTLY character-for-character from the contract text below. Do not paraphrase, translate, fix typos, change punctuation or add/remove diacritics. It must be long enough to be unique in the contract.
- A clause runs from its startMarker up to the next clause's startMarker, so together the clauses must cover the whole contract, in the order they appear, without skipping any part.
- The first clause starts at the very beginning of the contract.
- "title" is the clause heading if the contract has one, otherwise omit it.
- ${spec.categoryRule}
- ${SUMMARY_RULE}
- If the text has no clear clause structure, use your best judgement to split it into logically distinct provisions.${placeholderInstruction(spec.redactor)}

Contract text:
"""
${contractText}
"""`;
}

async function segmentByMarkers(spec: ClassificationSpec, contractText: string): Promise<SegmentedClause[]> {
  const { masked, toOriginalOffset } = spec.redactor.maskWithOffsets(contractText);
  const schemas = markerSchemas(spec);
  const raw = await generateJson(buildMarkerPrompt(spec, masked), schemas.response);

  const parsed = schemas.result.safeParse(raw);
  if (!parsed.success) {
    throw AppError.internal('LLM returned an unexpected clause segmentation format.');
  }

  const llmClauses = parsed.data.clauses;
  const spans = splitByStartMarkers(
    masked,
    llmClauses.map((c) => c.startMarker),
  ).map((span) => ({
    ...span,
    startOffset: toOriginalOffset(span.startOffset),
    endOffset: toOriginalOffset(span.endOffset),
  }));
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
      title: clause.title ? spec.redactor.unmask(clause.title) : undefined,
      text: contractText.slice(span.startOffset, span.endOffset),
      startOffset: span.startOffset,
      endOffset: span.endOffset,
      category: clause.category,
      summary: spec.redactor.unmask(clause.summary),
    };
  });
}

export async function segmentContractClauses(
  contractText: string,
  options: SegmentationOptions,
): Promise<SegmentedClause[]> {
  const spec = buildSpec(options);
  const articles = splitByArticleHeadings(contractText);
  return articles
    ? classifyArticles(spec, contractText, articles)
    : segmentByMarkers(spec, contractText);
}
