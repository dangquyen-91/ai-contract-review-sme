import { Type } from '@google/genai';
import { z } from 'zod';
import { CLAUSE_CATEGORIES } from '../models/clause.model';
import { CONTRACT_TYPES } from '../models/contract.model';
import { RISK_SEVERITIES } from '../models/riskFinding.model';
import { AppError } from '../errors/AppError';
import { generateJson } from './llm.service';

const CONTRACT_TYPE_LABELS: Record<(typeof CONTRACT_TYPES)[number], string> = {
  sales: 'hop dong mua ban hang hoa',
  service: 'hop dong cung ung dich vu',
  labor: 'hop dong lao dong',
  saas: 'hop dong thue phan mem/cong nghe (SaaS)',
};

export interface ClauseInput {
  index: number;
  category: (typeof CLAUSE_CATEGORIES)[number];
  text: string;
}

export interface ClauseRiskFinding {
  findingType: 'clause_risk';
  clauseIndex: number;
  severity: (typeof RISK_SEVERITIES)[number];
  title: string;
  explanation: string;
  suggestedRevision?: string;
}

export interface MissingClauseFinding {
  findingType: 'missing_clause';
  expectedClauseCategory: (typeof CLAUSE_CATEGORIES)[number];
  severity: (typeof RISK_SEVERITIES)[number];
  title: string;
  explanation: string;
  suggestedRevision?: string;
}

export type RiskDetectionFinding = ClauseRiskFinding | MissingClauseFinding;

const findingResultSchema = z.object({
  findings: z.array(
    z.union([
      z.object({
        findingType: z.literal('clause_risk'),
        clauseIndex: z.number().int(),
        severity: z.enum(RISK_SEVERITIES),
        title: z.string().min(1),
        explanation: z.string().min(1),
        suggestedRevision: z.string().nullable().optional(),
      }),
      z.object({
        findingType: z.literal('missing_clause'),
        expectedClauseCategory: z.enum(CLAUSE_CATEGORIES),
        severity: z.enum(RISK_SEVERITIES),
        title: z.string().min(1),
        explanation: z.string().min(1),
        suggestedRevision: z.string().nullable().optional(),
      }),
    ]),
  ),
});

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    findings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          findingType: { type: Type.STRING, enum: ['clause_risk', 'missing_clause'] },
          clauseIndex: { type: Type.INTEGER, nullable: true },
          expectedClauseCategory: {
            type: Type.STRING,
            enum: [...CLAUSE_CATEGORIES],
            nullable: true,
          },
          severity: { type: Type.STRING, enum: [...RISK_SEVERITIES] },
          title: { type: Type.STRING },
          explanation: { type: Type.STRING },
          suggestedRevision: { type: Type.STRING, nullable: true },
        },
        required: ['findingType', 'severity', 'title', 'explanation'],
      },
    },
  },
  required: ['findings'],
};

function buildPrompt(contractType: (typeof CONTRACT_TYPES)[number], clauses: ClauseInput[]): string {
  const clauseList = clauses
    .map((c) => `[index=${c.index}] (${c.category}) ${c.text}`)
    .join('\n\n');

  return `You are a legal risk analyst reviewing a Vietnamese contract of type "${CONTRACT_TYPE_LABELS[contractType]}".

Below is the list of clauses already segmented and classified from this contract. Review them for risk, and separately judge whether any standard protective clause is missing for this contract type.

Produce a list of findings. Each finding is either:
1. "clause_risk" - a risky clause that already exists. Set "clauseIndex" to the matching clause's index. Look for things like: penalty terms, auto-renewal, unilateral termination rights, liability limitation/exclusion, unfavorable payment terms, one-sided obligations.
2. "missing_clause" - a standard protective clause category (one of: ${CLAUSE_CATEGORIES.join(', ')}) that is typically expected for this contract type but does not appear in the clause list at all. Set "expectedClauseCategory" to that category.

Rules:
- Only report real, specific risks/gaps. Do not invent findings for clauses that are fair and standard.
- "severity" must be exactly one of: ${RISK_SEVERITIES.join(', ')}.
- "title" is a short (max ~10 words) Vietnamese label for the finding.
- "explanation" is 1-4 sentences in Vietnamese, plain language, explaining why it is risky or why the missing clause matters.
- "suggestedRevision" (optional) is a short Vietnamese suggestion of how to reword the clause, or what clause text to add.
- If there are no risks and nothing missing, return an empty "findings" array.

Clauses:
"""
${clauseList}
"""`;
}

export async function detectContractRisks(
  contractType: (typeof CONTRACT_TYPES)[number],
  clauses: ClauseInput[],
): Promise<RiskDetectionFinding[]> {
  const raw = await generateJson(buildPrompt(contractType, clauses), responseSchema);

  const parsed = findingResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw AppError.internal('LLM returned an unexpected risk detection format.');
  }

  return parsed.data.findings.map((finding) =>
    finding.findingType === 'clause_risk'
      ? {
          findingType: 'clause_risk',
          clauseIndex: finding.clauseIndex,
          severity: finding.severity,
          title: finding.title,
          explanation: finding.explanation,
          suggestedRevision: finding.suggestedRevision ?? undefined,
        }
      : {
          findingType: 'missing_clause',
          expectedClauseCategory: finding.expectedClauseCategory,
          severity: finding.severity,
          title: finding.title,
          explanation: finding.explanation,
          suggestedRevision: finding.suggestedRevision ?? undefined,
        },
  );
}
