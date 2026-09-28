import { Type } from '@google/genai';
import { z } from 'zod';
import { CLAUSE_CATEGORIES } from '../models/clause.model';
import { CONTRACT_TYPES } from '../models/contract.model';
import { RISK_SEVERITIES } from '../models/riskFinding.model';
import { AppError } from '../errors/AppError';
import { generateJson } from './llm.service';

export const CONTRACT_TYPE_LABELS: Record<(typeof CONTRACT_TYPES)[number], string> = {
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

export interface LegalExcerptInput {
  number: number;
  citationLabel: string;
  articleRef?: string;
  text: string;
}

export interface ClauseRiskFinding {
  findingType: 'clause_risk';
  clauseIndex: number;
  severity: (typeof RISK_SEVERITIES)[number];
  title: string;
  explanation: string;
  suggestedRevision?: string;
  citedExcerptNumbers: number[];
}

export interface MissingClauseFinding {
  findingType: 'missing_clause';
  expectedClauseCategory: (typeof CLAUSE_CATEGORIES)[number];
  severity: (typeof RISK_SEVERITIES)[number];
  title: string;
  explanation: string;
  suggestedRevision?: string;
  citedExcerptNumbers: number[];
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
        citedExcerptNumbers: z.array(z.number().int()).nullable().optional(),
      }),
      z.object({
        findingType: z.literal('missing_clause'),
        expectedClauseCategory: z.enum(CLAUSE_CATEGORIES),
        severity: z.enum(RISK_SEVERITIES),
        title: z.string().min(1),
        explanation: z.string().min(1),
        suggestedRevision: z.string().nullable().optional(),
        citedExcerptNumbers: z.array(z.number().int()).nullable().optional(),
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
          citedExcerptNumbers: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
            nullable: true,
          },
        },
        required: ['findingType', 'severity', 'title', 'explanation'],
      },
    },
  },
  required: ['findings'],
};

function buildPrompt(
  contractType: (typeof CONTRACT_TYPES)[number],
  clauses: ClauseInput[],
  legalExcerpts: LegalExcerptInput[],
): string {
  const clauseList = clauses
    .map((c) => `[index=${c.index}] (${c.category}) ${c.text}`)
    .join('\n\n');

  const legalContextBlock =
    legalExcerpts.length > 0
      ? `\n\nBelow are excerpts from Vietnamese legal sources that may be relevant to these clauses (retrieved by semantic search, may or may not actually apply):\n"""\n${legalExcerpts
          .map((e) => `[${e.number}] (${e.citationLabel}${e.articleRef ? `, ${e.articleRef}` : ''}) ${e.text}`)
          .join('\n\n')}\n"""\n\nWhen a finding's reasoning genuinely relies on one of these excerpts, set "citedExcerptNumbers" to the matching excerpt number(s) (e.g. [1] or [1, 3]). If none of the excerpts actually support the finding, leave "citedExcerptNumbers" empty - do not cite an excerpt just because it was provided.`
      : '';

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
- If there are no risks and nothing missing, return an empty "findings" array.${legalContextBlock}

Clauses:
"""
${clauseList}
"""`;
}

export async function detectContractRisks(
  contractType: (typeof CONTRACT_TYPES)[number],
  clauses: ClauseInput[],
  legalExcerpts: LegalExcerptInput[] = [],
): Promise<RiskDetectionFinding[]> {
  const raw = await generateJson(buildPrompt(contractType, clauses, legalExcerpts), responseSchema);

  const parsed = findingResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw AppError.internal('LLM returned an unexpected risk detection format.');
  }

  const validExcerptNumbers = new Set(legalExcerpts.map((e) => e.number));
  const sanitizeCitations = (numbers: number[] | null | undefined) =>
    (numbers ?? []).filter((n) => validExcerptNumbers.has(n));

  return parsed.data.findings.map((finding) =>
    finding.findingType === 'clause_risk'
      ? {
          findingType: 'clause_risk',
          clauseIndex: finding.clauseIndex,
          severity: finding.severity,
          title: finding.title,
          explanation: finding.explanation,
          suggestedRevision: finding.suggestedRevision ?? undefined,
          citedExcerptNumbers: sanitizeCitations(finding.citedExcerptNumbers),
        }
      : {
          findingType: 'missing_clause',
          expectedClauseCategory: finding.expectedClauseCategory,
          severity: finding.severity,
          title: finding.title,
          explanation: finding.explanation,
          suggestedRevision: finding.suggestedRevision ?? undefined,
          citedExcerptNumbers: sanitizeCitations(finding.citedExcerptNumbers),
        },
  );
}
