import { Type } from '@google/genai';
import { z } from 'zod';
import { CONTRACT_TYPES } from '../models/contract.model';
import { AppError } from '../errors/AppError';
import { generateJson } from './llm.service';
import { CONTRACT_TYPE_LABELS } from './riskDetection.service';

export interface ClauseSummaryInput {
  category: string;
  summary: string;
}

const summaryResultSchema = z.object({
  points: z.array(z.string().min(1)).min(1),
});

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    points: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['points'],
};

function buildPrompt(
  contractType: (typeof CONTRACT_TYPES)[number],
  clauses: ClauseSummaryInput[],
  analysisFocus?: string,
): string {
  const focusBlock = analysisFocus
    ? `\n\nThe user asked for this specific analysis direction, so emphasize the parts of the contract relevant to it: "${analysisFocus}"`
    : '';

  const clauseList = clauses.map((c) => `- (${c.category}) ${c.summary}`).join('\n');

  return `You are a legal analyst writing a plain-language overview of a Vietnamese contract of type "${CONTRACT_TYPE_LABELS[contractType]}" for a small business owner with no legal background.

Below is a list of short summaries of each clause already extracted from the contract, in order.

Write the overview as 3-5 Vietnamese bullet points ("points"), each one short sentence or two, covering: the purpose of the contract and the parties, the contract value and payment terms, the duration, and the termination/renewal terms if present. Do not just concatenate the clause summaries - synthesize them. Do not analyze risk here (that is done separately).${focusBlock}

Clause summaries:
"""
${clauseList}
"""`;
}

export async function summarizeContract(
  contractType: (typeof CONTRACT_TYPES)[number],
  clauses: ClauseSummaryInput[],
  analysisFocus?: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const raw = await generateJson(
    buildPrompt(contractType, clauses, analysisFocus),
    responseSchema,
    signal,
  );

  const parsed = summaryResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw AppError.internal('LLM returned an unexpected contract summary format.');
  }

  return parsed.data.points;
}
