import { Type } from '@google/genai';
import { z } from 'zod';
import { RISK_CODES, RISK_SEVERITIES } from '../../models/riskFinding.model';
import { AppError } from '../../errors/AppError';
import { generateJson } from '../ai/llm.service';
import { describeReviewContext, ReviewContext } from '../contract/contractProfile.service';
import { placeholderInstruction, Redactor } from '../ai/redaction.service';
import { RISK_CATALOG, RiskCode } from './riskCatalog.data';

type Severity = (typeof RISK_SEVERITIES)[number];

const SEVERITY_RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2 };

const LLM_RISK_CODES = RISK_CODES.filter((code) => code !== 'MISSING_CLAUSE');

function resolveRiskCode(value: string | null | undefined): RiskCode {
  return LLM_RISK_CODES.find((code) => code === value) ?? 'OTHER';
}

function clampSeverity(code: RiskCode, severity: Severity): Severity {
  const allowed = RISK_CATALOG[code].severities;
  if (allowed.includes(severity)) return severity;
  return allowed.reduce((best, s) =>
    Math.abs(SEVERITY_RANK[s] - SEVERITY_RANK[severity]) < Math.abs(SEVERITY_RANK[best] - SEVERITY_RANK[severity])
      ? s
      : best,
  );
}

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

export interface RuleFindingInput {
  ruleCode: string;
  clauseIndex?: number;
  title: string;
  problem: string[];
}

export interface LlmRuleRevision {
  ruleCode: string;
  originalText?: string;
  revisedText: string;
  reason?: string;
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
  riskCode: RiskCode;
  severity: Severity;
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
  ruleRevisions: LlmRuleRevision[];
  coveredMissingCodes: string[];
}

export interface ClauseBatchInput extends ClauseInput {
  excerpts: LegalExcerptInput[];
}

export interface FindingSummaryInput {
  clauseIndex?: number;
  riskCode: string;
  severity: string;
  title: string;
}

export interface ClauseBatchResult {
  findings: LlmFinding[];
  ruleRevisions: LlmRuleRevision[];
}

const stringList = z.array(z.string()).nullable().optional();

const normalizeForMatch = (value: string) => value.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();

const findingResultSchema = z.object({
  overallAssessment: stringList,
  coveredMissingClauses: z
    .array(z.object({ code: z.string(), clauseIndex: z.number().int(), quote: z.string() }))
    .nullable()
    .optional(),
  ruleRevisions: z
    .array(
      z.object({
        ruleCode: z.string(),
        originalText: z.string().nullable().optional(),
        revisedText: z.string().min(1),
        reason: z.string().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
  findings: z.array(
    z.object({
      clauseIndex: z.number().int().nullable().optional(),
      missingClauseCode: z.string().nullable().optional(),
      riskCode: z.string().nullable().optional(),
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

type ParsedResult = z.infer<typeof findingResultSchema>;

const stringArraySchema = { type: Type.ARRAY, items: { type: Type.STRING } };

const ruleRevisionsSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      ruleCode: { type: Type.STRING },
      originalText: { type: Type.STRING, nullable: true },
      revisedText: { type: Type.STRING },
      reason: { type: Type.STRING },
    },
    required: ['ruleCode', 'revisedText'],
  },
};

const coveredMissingClausesSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      code: { type: Type.STRING },
      clauseIndex: { type: Type.INTEGER },
      quote: { type: Type.STRING },
    },
    required: ['code', 'clauseIndex', 'quote'],
  },
};

const findingProperties = {
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
};

const findingRequired = ['severity', 'title', 'problem', 'consequences', 'recommendations'];

const clauseBatchResponseSchema = {
  type: Type.OBJECT,
  properties: {
    findings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          clauseIndex: { type: Type.INTEGER },
          riskCode: { type: Type.STRING, enum: [...LLM_RISK_CODES] },
          ...findingProperties,
        },
        required: ['clauseIndex', 'riskCode', ...findingRequired],
      },
    },
    ruleRevisions: ruleRevisionsSchema,
  },
  required: ['findings'],
};

const contractLevelResponseSchema = {
  type: Type.OBJECT,
  properties: {
    overallAssessment: stringArraySchema,
    coveredMissingClauses: coveredMissingClausesSchema,
    ruleRevisions: ruleRevisionsSchema,
    findings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          missingClauseCode: { type: Type.STRING },
          ...findingProperties,
        },
        required: ['missingClauseCode', ...findingRequired],
      },
    },
  },
  required: ['overallAssessment', 'findings'],
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    overallAssessment: stringArraySchema,
    coveredMissingClauses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING },
          clauseIndex: { type: Type.INTEGER },
          quote: { type: Type.STRING },
        },
        required: ['code', 'clauseIndex', 'quote'],
      },
    },
    ruleRevisions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ruleCode: { type: Type.STRING },
          originalText: { type: Type.STRING, nullable: true },
          revisedText: { type: Type.STRING },
          reason: { type: Type.STRING },
        },
        required: ['ruleCode', 'revisedText'],
      },
    },
    findings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          clauseIndex: { type: Type.INTEGER, nullable: true },
          missingClauseCode: { type: Type.STRING, nullable: true },
          riskCode: { type: Type.STRING, nullable: true, enum: [...LLM_RISK_CODES] },
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
  ruleFindings: RuleFindingInput[],
  analysisFocus: string | undefined,
  redactionNote: string,
): string {
  const ruleBlock =
    ruleFindings.length > 0
      ? `\n\nThese problems were already found by fixed checks against Vietnamese law:\n${ruleFindings
          .map(
            (r) =>
              `- ruleCode="${r.ruleCode}" (${r.clauseIndex === undefined ? 'whole contract' : `clause index=${r.clauseIndex}`}): ${r.title}. ${r.problem.join(' ')}`,
          )
          .join('\n')}\nDo NOT report them again in "findings" (you may still report other, different problems in the same clauses), but take them into account in "overallAssessment". For EACH of them add one "ruleRevisions" item with its "ruleCode", a "revisedText" that fixes the problem and a short Vietnamese "reason". When it names a clause index, "originalText" MUST be copied verbatim from that clause; for the whole contract omit "originalText" and make "revisedText" a ready-to-insert clause in Vietnamese.`
      : '';

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
          )}\nClauses can be misclassified, so first check whether another clause actually covers each of them. If one does, do NOT add a finding for it; add an item to "coveredMissingClauses" with its "code", the "clauseIndex" of the covering clause and a "quote" copied verbatim from that clause that shows it. For EACH remaining one, add one finding with "missingClauseCode" set to its code and "clauseIndex" omitted. Its "proposedRevision.originalText" must be omitted and "proposedRevision.revisedText" must be a full ready-to-insert clause drafted in Vietnamese.`
      : '';

  const riskCatalogBlock = `\n\nRisk catalog (code (allowed severities): meaning):\n${LLM_RISK_CODES.map(
    (code) => `- ${code} (${RISK_CATALOG[code].severities.join(', ')}): ${RISK_CATALOG[code].description}`,
  ).join('\n')}`;

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
- "riskCode": for a finding about an existing clause, the code from the risk catalog below that best matches it. Use OTHER only when no code fits. "severity" must be one of the severities listed for that code. Omit "riskCode" for findings with "missingClauseCode".
- "title" is a short (max ~15 words) Vietnamese label for the finding.
- "problem": 1-3 Vietnamese bullet strings explaining what exactly is wrong or ambiguous in the clause.
- "consequences": 1-3 Vietnamese bullet strings on practical consequences (disputes, financial loss, difficulty proving obligations) for the user.
- "legalBasis": 0-2 items. Each has Vietnamese "text" explaining the relevant legal rule, and "citedExcerptNumbers". Only include it when a legal rule really applies.
- "recommendations": 1-3 Vietnamese bullet strings on how to fix the clause.
- "proposedRevision": for an existing clause, "originalText" MUST be copied verbatim from the clause text (the sentence(s) to replace), "revisedText" is the replacement text in the same language as the contract, "reason" is one short Vietnamese sentence on why the change helps.
- "overallAssessment": 2-5 Vietnamese bullet strings giving an overall evaluation of the contract (completeness, which party it favors, the most serious risks).
- If there are no risks and nothing is missing, return an empty "findings" array.${riskCatalogBlock}${focusBlock}${industryBlock}${legalContextBlock}${missingBlock}${ruleBlock}${redactionNote}

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
  ruleFindings: RuleFindingInput[],
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
      ruleFindings,
      analysisFocus ? redactor.mask(analysisFocus) : undefined,
      placeholderInstruction(redactor),
    ),
    responseSchema,
    signal,
  );
  const unmask = (value: string) => redactor.unmask(value);
  const parsed = parseResult(raw);
  const validMissingCodes = new Set(missingClauses.map((m) => m.code));

  return {
    overallAssessment: (parsed.overallAssessment ?? []).map(unmask),
    findings: toFindings(parsed.findings, {
      validExcerptNumbers: new Set(legalExcerpts.map((e) => e.number)),
      validMissingCodes,
      unmask,
    }),
    ruleRevisions: toRuleRevisions(parsed.ruleRevisions, ruleFindings, unmask),
    coveredMissingCodes: toCoveredMissingCodes(parsed.coveredMissingClauses, clauses, validMissingCodes, unmask),
  };
}

function parseResult(raw: unknown): ParsedResult {
  const parsed = findingResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw AppError.internal('LLM returned an unexpected risk detection format.');
  }
  return parsed.data;
}

interface FindingFilter {
  validExcerptNumbers: Set<number>;
  validMissingCodes: Set<string>;
  validClauseIndexes?: Set<number>;
  unmask: (value: string) => string;
}

function toFindings(
  items: ParsedResult['findings'],
  { validExcerptNumbers, validMissingCodes, validClauseIndexes, unmask }: FindingFilter,
): LlmFinding[] {
  const findings: LlmFinding[] = [];
  for (const f of items) {
    const missingClauseCode = f.missingClauseCode ?? undefined;
    if (missingClauseCode && !validMissingCodes.has(missingClauseCode)) continue;
    if (!missingClauseCode && f.clauseIndex == null) continue;
    if (!missingClauseCode && validClauseIndexes && !validClauseIndexes.has(f.clauseIndex!)) continue;
    const riskCode: RiskCode = missingClauseCode ? 'MISSING_CLAUSE' : resolveRiskCode(f.riskCode);

    findings.push({
      clauseIndex: missingClauseCode ? undefined : (f.clauseIndex ?? undefined),
      missingClauseCode,
      riskCode,
      severity: clampSeverity(riskCode, f.severity),
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
  return findings;
}

function toRuleRevisions(
  items: ParsedResult['ruleRevisions'],
  ruleFindings: RuleFindingInput[],
  unmask: (value: string) => string,
): LlmRuleRevision[] {
  const validRuleCodes = new Set(ruleFindings.map((r) => r.ruleCode));
  const seenRuleCodes = new Set<string>();
  const ruleRevisions: LlmRuleRevision[] = [];
  for (const r of items ?? []) {
    if (!validRuleCodes.has(r.ruleCode) || seenRuleCodes.has(r.ruleCode)) continue;
    seenRuleCodes.add(r.ruleCode);
    ruleRevisions.push({
      ruleCode: r.ruleCode,
      originalText: r.originalText ? unmask(r.originalText) : undefined,
      revisedText: unmask(r.revisedText),
      reason: r.reason ? unmask(r.reason) : undefined,
    });
  }
  return ruleRevisions;
}

function toCoveredMissingCodes(
  items: ParsedResult['coveredMissingClauses'],
  clauses: ClauseInput[],
  validMissingCodes: Set<string>,
  unmask: (value: string) => string,
): string[] {
  const clauseTextByIndex = new Map(clauses.map((c) => [c.index, normalizeForMatch(c.text)]));
  return [
    ...new Set(
      (items ?? [])
        .filter(
          (c) =>
            validMissingCodes.has(c.code) &&
            normalizeForMatch(unmask(c.quote)).length > 0 &&
            clauseTextByIndex.get(c.clauseIndex)?.includes(normalizeForMatch(unmask(c.quote))),
        )
        .map((c) => c.code),
    ),
  ];
}

const RISK_CATALOG_BLOCK = `\n\nRisk catalog (code (allowed severities): meaning):\n${LLM_RISK_CODES.map(
  (code) => `- ${code} (${RISK_CATALOG[code].severities.join(', ')}): ${RISK_CATALOG[code].description}`,
).join('\n')}`;

const VIETNAMESE_FIELDS_RULE =
  '- Write every Vietnamese field ("title", "problem", "consequences", "legalBasis", "recommendations", "reason", "overallAssessment") with full Vietnamese diacritics, even if the contract text itself has none. Only "originalText" and "revisedText" follow the contract\'s own language and spelling style.';

const FINDING_TEXT_RULES = `- "title" is a short (max ~15 words) Vietnamese label for the finding.
- "problem": 1-3 Vietnamese bullet strings explaining what exactly is wrong, ambiguous or missing.
- "consequences": 1-3 Vietnamese bullet strings on practical consequences (disputes, financial loss, difficulty proving obligations) for the user.
- "recommendations": 1-3 Vietnamese bullet strings on how to fix it.`;

const focusBlock = (analysisFocus?: string) =>
  analysisFocus
    ? `\n\nThe user asked for this specific analysis direction (follow it when judging risk, e.g. which party's interests to protect): "${analysisFocus}"`
    : '';

const excerptLine = (e: LegalExcerptInput) =>
  `[${e.number}] (${e.citationLabel}${e.articleRef ? `, ${e.articleRef}` : ''}) ${e.text}`;

const ruleLine = (r: RuleFindingInput) =>
  `- ruleCode="${r.ruleCode}"${r.clauseIndex === undefined ? '' : ` (clause index=${r.clauseIndex})`}: ${r.title}. ${r.problem.join(' ')}`;

function buildClauseBatchPrompt(
  context: ReviewContext,
  clauses: ClauseBatchInput[],
  ruleFindings: RuleFindingInput[],
  analysisFocus: string | undefined,
  redactionNote: string,
): string {
  const shownExcerpts = new Set<number>();
  const clauseList = clauses
    .map((c) => {
      const excerpts = c.excerpts.map((e) => {
        if (shownExcerpts.has(e.number)) return `[${e.number}] (same excerpt as above)`;
        shownExcerpts.add(e.number);
        return excerptLine(e);
      });
      return `[index=${c.index}] (${c.category}) ${c.text}${
        excerpts.length > 0 ? `\nLegal excerpts retrieved for this clause (may or may not apply):\n${excerpts.join('\n')}` : ''
      }`;
    })
    .join('\n\n');

  const ruleBlock =
    ruleFindings.length > 0
      ? `\n\nThese problems were already found in these clauses by fixed checks against Vietnamese law:\n${ruleFindings
          .map(ruleLine)
          .join('\n')}\nDo NOT report them again in "findings" (you may still report other, different problems in the same clauses). For EACH of them add one "ruleRevisions" item with its "ruleCode", a "revisedText" that fixes the problem and a short Vietnamese "reason"; "originalText" MUST be copied verbatim from that clause.`
      : '';

  const industryBlock =
    context.industryChecks.length > 0
      ? `\n\nFor the "${context.industryName}" industry, also check these points and report any of them that a clause handles unfavorably on that clause:\n${context.industryChecks
          .map((check) => `- ${check}`)
          .join('\n')}`
      : '';

  return `You are a legal risk analyst reviewing part of a Vietnamese contract.

${describeReviewContext(context)}

Below are some of the contract's clauses, already segmented and classified, in contract order. Each clause may be followed by legal excerpts retrieved for it. Review each clause for risk and report findings only about these clauses, with "clauseIndex" set to the clause's index. Look for things like: vague scope, penalty terms, auto-renewal, unilateral termination rights, liability limitation/exclusion, unfavorable payment terms, one-sided obligations. Do not report clause types that are missing from the contract; that is checked separately.

Rules:
${VIETNAMESE_FIELDS_RULE}
- Only report real, specific risks. Do not invent findings for clauses that are fair and standard.
- "riskCode": the code from the risk catalog below that best matches the finding. Use OTHER only when no code fits. "severity" must be one of the severities listed for that code.
${FINDING_TEXT_RULES}
- "legalBasis": 0-2 items, only when a legal rule really applies. Each has Vietnamese "text" explaining the rule and "citedExcerptNumbers": the number(s) of the excerpts that genuinely support it (e.g. [1] or [1, 3]). Leave it empty when no excerpt supports the item; do not cite an excerpt just because it was provided.
- "proposedRevision": "originalText" MUST be copied verbatim from the clause text (the sentence(s) to replace), "revisedText" is the replacement text in the same language as the contract, "reason" is one short Vietnamese sentence on why the change helps.
- If these clauses have no real risks, return an empty "findings" array.${RISK_CATALOG_BLOCK}${focusBlock(analysisFocus)}${industryBlock}${ruleBlock}${redactionNote}

Clauses:
"""
${clauseList}
"""`;
}

function buildContractLevelPrompt(
  context: ReviewContext,
  clauses: ClauseInput[],
  missingClauses: MissingClauseInput[],
  ruleFindings: RuleFindingInput[],
  findingSummaries: FindingSummaryInput[],
  analysisFocus: string | undefined,
  redactionNote: string,
): string {
  const clauseList = clauses.map((c) => `[index=${c.index}] (${c.category}) ${c.text}`).join('\n\n');

  const summaryBlock =
    findingSummaries.length > 0
      ? `\n\nRisks already found in individual clauses:\n${findingSummaries
          .map(
            (s) =>
              `- [${s.severity}] ${s.riskCode}${s.clauseIndex === undefined ? '' : ` (clause index=${s.clauseIndex})`}: ${s.title}`,
          )
          .join('\n')}`
      : '\n\nNo risks were found in individual clauses.';

  const missingBlock =
    missingClauses.length > 0
      ? `\n\nThe following clause types are normally expected in this kind of contract but were NOT found in it:\n${missingClauses
          .map((m) => `- code="${m.code}": ${m.name} (${m.description})`)
          .join(
            '\n',
          )}\nClauses can be misclassified, so first check whether another clause actually covers each of them. If one does, do NOT add a finding for it; add an item to "coveredMissingClauses" with its "code", the "clauseIndex" of the covering clause and a "quote" copied verbatim from that clause that shows it. For EACH remaining one, add one finding with "missingClauseCode" set to its code.`
      : '';

  const ruleBlock =
    ruleFindings.length > 0
      ? `\n\nThese problems concerning the whole contract were found by fixed checks against Vietnamese law:\n${ruleFindings
          .map(ruleLine)
          .join('\n')}\nDo NOT report them in "findings". For EACH of them add one "ruleRevisions" item with its "ruleCode", a "revisedText" that is a ready-to-insert clause in Vietnamese fixing the problem, and a short Vietnamese "reason"; omit "originalText".`
      : '';

  const industryBlock =
    context.industryChecks.length > 0
      ? `\n\nFor the "${context.industryName}" industry, the contract should address these points:\n${context.industryChecks
          .map((check) => `- ${check}`)
          .join('\n')}\nIf the contract does not address a point at all, mention it in "overallAssessment".`
      : '';

  return `You are a legal risk analyst reviewing a Vietnamese contract as a whole.

${describeReviewContext(context)}

The contract's clauses were already reviewed one by one. Do not report risks about individual clauses again. Your tasks:
1. "overallAssessment": 2-5 Vietnamese bullet strings giving an overall evaluation of the contract (completeness, which party it favors, the most serious risks), based on the clauses below and the risks already found.
2. Handle the clause types that are missing from the contract, if any are listed below.
3. Add "ruleRevisions" for the whole-contract problems, if any are listed below.

Rules:
${VIETNAMESE_FIELDS_RULE}
- "findings" only holds missing-clause findings. "severity" must be exactly one of: ${RISK_SEVERITIES.join(', ')}.
${FINDING_TEXT_RULES}
- "legalBasis": 0-2 items, only when a legal rule really applies, each with Vietnamese "text" explaining the rule; leave "citedExcerptNumbers" empty.
- "proposedRevision": omit "originalText"; "revisedText" is a full ready-to-insert clause drafted in Vietnamese; "reason" is one short Vietnamese sentence on why it helps.
- If nothing is missing, return an empty "findings" array.${summaryBlock}${missingBlock}${industryBlock}${ruleBlock}${focusBlock(analysisFocus)}${redactionNote}

Clauses:
"""
${clauseList}
"""`;
}

export async function detectClauseBatchRisks(
  context: ReviewContext,
  clauses: ClauseBatchInput[],
  ruleFindings: RuleFindingInput[],
  analysisFocus: string | undefined,
  redactor: Redactor,
  signal?: AbortSignal,
): Promise<ClauseBatchResult> {
  const raw = await generateJson(
    buildClauseBatchPrompt(
      context,
      clauses.map((c) => ({ ...c, text: redactor.mask(c.text) })),
      ruleFindings,
      analysisFocus ? redactor.mask(analysisFocus) : undefined,
      placeholderInstruction(redactor),
    ),
    clauseBatchResponseSchema,
    signal,
  );
  const unmask = (value: string) => redactor.unmask(value);
  const parsed = parseResult(raw);

  return {
    findings: toFindings(parsed.findings, {
      validExcerptNumbers: new Set(clauses.flatMap((c) => c.excerpts.map((e) => e.number))),
      validMissingCodes: new Set(),
      validClauseIndexes: new Set(clauses.map((c) => c.index)),
      unmask,
    }),
    ruleRevisions: toRuleRevisions(parsed.ruleRevisions, ruleFindings, unmask),
  };
}

export async function assessContractLevel(
  context: ReviewContext,
  clauses: ClauseInput[],
  missingClauses: MissingClauseInput[],
  ruleFindings: RuleFindingInput[],
  findingSummaries: FindingSummaryInput[],
  analysisFocus: string | undefined,
  redactor: Redactor,
  signal?: AbortSignal,
): Promise<RiskDetectionResult> {
  const raw = await generateJson(
    buildContractLevelPrompt(
      context,
      clauses.map((c) => ({ ...c, text: redactor.mask(c.text) })),
      missingClauses,
      ruleFindings,
      findingSummaries.map((s) => ({ ...s, title: redactor.mask(s.title) })),
      analysisFocus ? redactor.mask(analysisFocus) : undefined,
      placeholderInstruction(redactor),
    ),
    contractLevelResponseSchema,
    signal,
  );
  const unmask = (value: string) => redactor.unmask(value);
  const parsed = parseResult(raw);
  const validMissingCodes = new Set(missingClauses.map((m) => m.code));

  return {
    overallAssessment: (parsed.overallAssessment ?? []).map(unmask),
    findings: toFindings(parsed.findings, {
      validExcerptNumbers: new Set(),
      validMissingCodes,
      validClauseIndexes: new Set(),
      unmask,
    }),
    ruleRevisions: toRuleRevisions(parsed.ruleRevisions, ruleFindings, unmask),
    coveredMissingCodes: toCoveredMissingCodes(parsed.coveredMissingClauses, clauses, validMissingCodes, unmask),
  };
}
