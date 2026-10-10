import { Type } from '@google/genai';
import { z } from 'zod';
import { RISK_SEVERITIES } from '../models/riskFinding.model';
import { AppError } from '../errors/AppError';
import { generateJson } from './llm.service';
import { describeReviewContext, ReviewContext } from './contractProfile.service';
import { placeholderInstruction, Redactor } from './redaction.service';

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

export interface MissingClauseInput {
  code: string;
  name: string;
  description: string;
}

export interface LlmLegalBasis {
  text: string;
  citedExcerptNumbers: number[];
}

export interface LlmProposedRevision {
  originalText?: string;
  revisedText: string;
  reason?: string;
}

export interface LlmFinding {
  // Exactly one of clauseIndex / missingClauseCode is set.
  clauseIndex?: number;
  missingClauseCode?: string;
  severity: (typeof RISK_SEVERITIES)[number];
  title: string;
  problem: string[];
  consequences: string[];
  legalBasis: LlmLegalBasis[];
  recommendations: string[];
  proposedRevision?: LlmProposedRevision;
}

export interface RiskDetectionResult {
  overallAssessment: string[];
  findings: LlmFinding[];
}

const stringList = z.array(z.string()).nullable().optional();

const findingResultSchema = z.object({
  overallAssessment: stringList,
  findings: z.array(
    z.object({
      clauseIndex: z.number().int().nullable().optional(),
      missingClauseCode: z.string().nullable().optional(),
      severity: z.enum(RISK_SEVERITIES),
      title: z.string().min(1),
      problem: stringList,
      consequences: stringList,
      legalBasis: z
        .array(
          z.object({
            text: z.string().min(1),
            citedExcerptNumbers: z.array(z.number().int()).nullable().optional(),
          }),
        )
        .nullable()
        .optional(),
      recommendations: stringList,
      proposedRevision: z
        .object({
          originalText: z.string().nullable().optional(),
          revisedText: z.string().min(1),
          reason: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
    }),
  ),
});

const stringArraySchema = { type: Type.ARRAY, items: { type: Type.STRING } };

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    overallAssessment: stringArraySchema,
    findings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          clauseIndex: { type: Type.INTEGER, nullable: true },
          missingClauseCode: { type: Type.STRING, nullable: true },
          severity: { type: Type.STRING, enum: [...RISK_SEVERITIES] },
          title: { type: Type.STRING },
          problem: stringArraySchema,
          consequences: stringArraySchema,
          legalBasis: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                citedExcerptNumbers: { type: Type.ARRAY, items: { type: Type.INTEGER } },
              },
              required: ['text'],
            },
          },
          recommendations: stringArraySchema,
          proposedRevision: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
              originalText: { type: Type.STRING, nullable: true },
              revisedText: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
            required: ['revisedText'],
          },
        },
        required: ['severity', 'title', 'problem', 'consequences', 'recommendations'],
      },
    },
  },
  required: ['overallAssessment', 'findings'],
};

function buildPrompt(
  context: ReviewContext,
  clauses: ClauseInput[],
  legalExcerpts: LegalExcerptInput[],
  missingClauses: MissingClauseInput[],
  analysisFocus: string | undefined,
  redactionNote: string,
): string {
  const focusBlock = analysisFocus
    ? `\n\nThe user asked for this specific analysis direction (follow it when judging risk, e.g. which party's interests to protect): "${analysisFocus}"`
    : '';

  const clauseList = clauses
    .map((c) => `[index=${c.index}] (${c.category}) ${c.text}`)
    .join('\n\n');

  const legalContextBlock =
    legalExcerpts.length > 0
      ? `\n\nBelow are excerpts from Vietnamese legal sources that may be relevant to these clauses (retrieved by semantic search, may or may not actually apply):\n"""\n${legalExcerpts
          .map((e) => `[${e.number}] (${e.citationLabel}${e.articleRef ? `, ${e.articleRef}` : ''}) ${e.text}`)
          .join('\n\n')}\n"""\n\nWhen a "legalBasis" item genuinely relies on one of these excerpts, set its "citedExcerptNumbers" to the matching excerpt number(s) (e.g. [1] or [1, 3]). If no excerpt supports the item, leave "citedExcerptNumbers" empty - do not cite an excerpt just because it was provided.`
      : '';

  const missingBlock =
    missingClauses.length > 0
      ? `\n\nThe following clause types are normally expected in this kind of contract but were NOT found in it:\n${missingClauses
          .map((m) => `- code="${m.code}": ${m.name} (${m.description})`)
          .join(
            '\n',
          )}\nFor EACH of them, add one finding with "missingClauseCode" set to its code and "clauseIndex" omitted. Its "proposedRevision.originalText" must be omitted and "proposedRevision.revisedText" must be a full ready-to-insert clause drafted in Vietnamese.`
      : '';

  const industryBlock =
    context.industryChecks.length > 0
      ? `\n\nFor the "${context.industryName}" industry, also check these points:\n${context.industryChecks
          .map((check) => `- ${check}`)
          .join('\n')}\nIf a clause handles one of these points unfavorably, report it on that clause. If the contract does not address a point at all, mention it in "overallAssessment".`
      : '';

  return `You are a legal risk analyst reviewing a Vietnamese contract.

${describeReviewContext(context)}

Below is the list of clauses already segmented and classified from this contract. Review each clause for risk. For findings about an existing clause, set "clauseIndex" to that clause's index. Look for things like: vague scope, penalty terms, auto-renewal, unilateral termination rights, liability limitation/exclusion, unfavorable payment terms, one-sided obligations.

Rules:
- Write every Vietnamese field ("title", "problem", "consequences", "legalBasis", "recommendations", "reason", "overallAssessment") with full Vietnamese diacritics, even if the contract text itself has none. Only "originalText" and "revisedText" follow the contract's own language and spelling style.
- Only report real, specific risks. Do not invent findings for clauses that are fair and standard.
- "severity" must be exactly one of: ${RISK_SEVERITIES.join(', ')}.
- "title" is a short (max ~15 words) Vietnamese label for the finding.
- "problem": 1-3 Vietnamese bullet strings explaining what exactly is wrong or ambiguous in the clause.
- "consequences": 1-3 Vietnamese bullet strings on practical consequences (disputes, financial loss, difficulty proving obligations) for the user.
- "legalBasis": 0-2 items. Each has Vietnamese "text" explaining the relevant legal rule, and "citedExcerptNumbers". Only include it when a legal rule really applies.
- "recommendations": 1-3 Vietnamese bullet strings on how to fix the clause.
- "proposedRevision": for an existing clause, "originalText" MUST be copied verbatim from the clause text (the sentence(s) to replace), "revisedText" is the replacement text in the same language as the contract, "reason" is one short Vietnamese sentence on why the change helps.
- "overallAssessment": 2-5 Vietnamese bullet strings giving an overall evaluation of the contract (completeness, which party it favors, the most serious risks).
- If there are no risks and nothing is missing, return an empty "findings" array.${focusBlock}${industryBlock}${legalContextBlock}${missingBlock}${redactionNote}

Clauses:
"""
${clauseList}
"""`;
}

export async function detectContractRisks(
  context: ReviewContext,
  clauses: ClauseInput[],
  legalExcerpts: LegalExcerptInput[] = [],
  missingClauses: MissingClauseInput[],
  analysisFocus: string | undefined,
  redactor: Redactor,
  signal?: AbortSignal,
): Promise<RiskDetectionResult> {
  const raw = await generateJson(
    buildPrompt(
      context,
      clauses.map((c) => ({ ...c, text: redactor.mask(c.text) })),
      legalExcerpts,
      missingClauses,
      analysisFocus ? redactor.mask(analysisFocus) : undefined,
      placeholderInstruction(redactor),
    ),
    responseSchema,
    signal,
  );
  const unmask = (value: string) => redactor.unmask(value);

  const parsed = findingResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw AppError.internal('LLM returned an unexpected risk detection format.');
  }

  const validExcerptNumbers = new Set(legalExcerpts.map((e) => e.number));
  const validMissingCodes = new Set(missingClauses.map((m) => m.code));

  const findings: LlmFinding[] = [];
  for (const f of parsed.data.findings) {
    const missingClauseCode = f.missingClauseCode ?? undefined;
    if (missingClauseCode && !validMissingCodes.has(missingClauseCode)) continue;
    if (!missingClauseCode && f.clauseIndex == null) continue;

    findings.push({
      clauseIndex: missingClauseCode ? undefined : (f.clauseIndex ?? undefined),
      missingClauseCode,
      severity: f.severity,
      title: unmask(f.title),
      problem: (f.problem ?? []).map(unmask),
      consequences: (f.consequences ?? []).map(unmask),
      legalBasis: (f.legalBasis ?? []).map((b) => ({
        text: unmask(b.text),
        citedExcerptNumbers: (b.citedExcerptNumbers ?? []).filter((n) => validExcerptNumbers.has(n)),
      })),
      recommendations: (f.recommendations ?? []).map(unmask),
      proposedRevision: f.proposedRevision
        ? {
            originalText:
              missingClauseCode || !f.proposedRevision.originalText
                ? undefined
                : unmask(f.proposedRevision.originalText),
            revisedText: unmask(f.proposedRevision.revisedText),
            reason: f.proposedRevision.reason ? unmask(f.proposedRevision.reason) : undefined,
          }
        : undefined,
    });
  }

  return { overallAssessment: (parsed.data.overallAssessment ?? []).map(unmask), findings };
}
