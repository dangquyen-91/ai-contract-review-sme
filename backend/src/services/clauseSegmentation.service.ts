import { Type } from '@google/genai';
import { z } from 'zod';
import { CLAUSE_CATEGORIES } from '../models/clause.model';
import { AppError } from '../errors/AppError';
import { generateJson } from './llm.service';

export interface SegmentedClause {
  index: number;
  title?: string;
  text: string;
  category: (typeof CLAUSE_CATEGORIES)[number];
}

const clauseResultSchema = z.object({
  clauses: z.array(
    z.object({
      title: z.string().nullable().optional(),
      text: z.string().min(1),
      category: z.enum(CLAUSE_CATEGORIES),
    }),
  ),
});

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    clauses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, nullable: true },
          text: { type: Type.STRING },
          category: { type: Type.STRING, enum: [...CLAUSE_CATEGORIES] },
        },
        required: ['text', 'category'],
      },
    },
  },
  required: ['clauses'],
};

function buildPrompt(contractText: string): string {
  return `You are a legal contract analyst reviewing a Vietnamese contract.

Split the contract text below into individual clauses and classify each clause into exactly ONE of these categories: ${CLAUSE_CATEGORIES.join(', ')}.

Rules:
- "text" must be the verbatim clause text copied from the contract (same language, no paraphrasing or translation).
- "title" is the clause heading if the contract has one (e.g. "Dieu 3: Thanh toan"), otherwise omit it.
- "category" must be exactly one of: ${CLAUSE_CATEGORIES.join(', ')}. Use "other" if nothing fits.
- Keep clauses in the same order they appear in the contract.
- If the text has no clear clause structure, use your best judgement to split it into logically distinct provisions.

Contract text:
"""
${contractText}
"""`;
}

export async function segmentContractClauses(contractText: string): Promise<SegmentedClause[]> {
  const raw = await generateJson(buildPrompt(contractText), responseSchema);

  const parsed = clauseResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw AppError.internal('LLM returned an unexpected clause segmentation format.');
  }

  return parsed.data.clauses.map((clause, index) => ({
    index,
    title: clause.title ?? undefined,
    text: clause.text,
    category: clause.category,
  }));
}
