import { Type } from '@google/genai';
import { z } from 'zod';
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
  category: string;
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

const findingResultSchema = z.object({
  findings: z.array(
    z.object({
      clauseIndex: z.number().int(),
      severity: z.enum(RISK_SEVERITIES),
      title: z.string().min(1),
      explanation: z.string().min(1),
      suggestedRevision: z.string().nullable().optional(),
      citedExcerptNumbers: z.array(z.number().int()).nullable().optional(),
    }),
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
          clauseIndex: { type: Type.INTEGER },
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
        required: ['clauseIndex', 'severity', 'title', 'explanation'],
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

Below is the list of clauses already segmented and classified from this contract. Review each clause for risk. Set "clauseIndex" to the matching clause's index. Look for things like: penalty terms, auto-renewal, unilateral termination rights, liability limitation/exclusion, unfavorable payment terms, one-sided obligations.

Rules:
- Only report real, specific risks. Do not invent findings for clauses that are fair and standard.
- "severity" must be exactly one of: ${RISK_SEVERITIES.join(', ')}.
- "title" is a short (max ~10 words) Vietnamese label for the finding.
- "explanation" is 1-4 sentences in Vietnamese, plain language, explaining why it is risky.
- "suggestedRevision" (optional) is a short Vietnamese suggestion of how to reword the clause.
- If there are no risks, return an empty "findings" array.${legalContextBlock}

Clauses:
"""
${clauseList}
"""`;
}

export async function detectContractRisks(
  contractType: (typeof CONTRACT_TYPES)[number],
  clauses: ClauseInput[],
  legalExcerpts: LegalExcerptInput[] = [],
): Promise<ClauseRiskFinding[]> {
  const raw = await generateJson(buildPrompt(contractType, clauses, legalExcerpts), responseSchema);

  const parsed = findingResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw AppError.internal('LLM returned an unexpected risk detection format.');
  }

  const validExcerptNumbers = new Set(legalExcerpts.map((e) => e.number));

  return parsed.data.findings.map((finding) => ({
    findingType: 'clause_risk' as const,
    clauseIndex: finding.clauseIndex,
    severity: finding.severity,
    title: finding.title,
    explanation: finding.explanation,
    suggestedRevision: finding.suggestedRevision ?? undefined,
    citedExcerptNumbers: (finding.citedExcerptNumbers ?? []).filter((n) => validExcerptNumbers.has(n)),
  }));
}
