import { Type } from '@google/genai';
import { z } from 'zod';
import { CLAUSE_CATEGORIES } from '../models/clause.model';
import { CONTRACT_TYPES } from '../models/contract.model';
import { AppError } from '../errors/AppError';
import { generateJson } from './llm.service';
import { CONTRACT_TYPE_LABELS } from './riskDetection.service';

export interface ClauseSummaryInput {
  category: (typeof CLAUSE_CATEGORIES)[number];
  summary: string;
}

const summaryResultSchema = z.object({
  summary: z.string().min(1),
});

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
  },
  required: ['summary'],
};

function buildPrompt(
  contractType: (typeof CONTRACT_TYPES)[number],
  clauses: ClauseSummaryInput[],
): string {
  const clauseList = clauses.map((c) => `- (${c.category}) ${c.summary}`).join('\n');

  return `You are a legal analyst writing a plain-language overview of a Vietnamese contract of type "${CONTRACT_TYPE_LABELS[contractType]}" for a small business owner with no legal background.

Below is a list of short summaries of each clause already extracted from the contract, in order.

Write ONE cohesive Vietnamese summary of the whole contract, 4-8 sentences, plain language, covering: the purpose of the contract, the main obligations of each party, key payment terms, and duration/termination/renewal terms if present. Do not just concatenate the clause summaries - synthesize them into a coherent overview. Do not analyze risk here (that is done separately).

Clause summaries:
"""
${clauseList}
"""`;
}

export async function summarizeContract(
  contractType: (typeof CONTRACT_TYPES)[number],
  clauses: ClauseSummaryInput[],
): Promise<string> {
  const raw = await generateJson(buildPrompt(contractType, clauses), responseSchema);

  const parsed = summaryResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw AppError.internal('LLM returned an unexpected contract summary format.');
  }

  return parsed.data.summary;
}
