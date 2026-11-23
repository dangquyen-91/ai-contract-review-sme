import { Schema, Type } from '@google/genai';
import { Types } from 'mongoose';
import { z } from 'zod';
import { logger } from '../../config/logger';
import { AppError } from '../../errors/AppError';
import { ClauseModel } from '../../models/clause.model';
import type { ClauseCategory } from '../../models/clauseTypeTaxonomy.model';
import { ContractModel } from '../../models/contract.model';
import { ContractVersionModel } from '../../models/contractVersion.model';
import { RiskCitationModel } from '../../models/riskCitation.model';
import { RiskFindingModel } from '../../models/riskFinding.model';
import { createRedactor, placeholderInstruction, Redactor } from '../ai/redaction.service';
import { loadChunkSnapshots } from '../analysis/risk.service';
import { getTaxonomyByCodes } from '../analysis/clauseTypeTaxonomy.service';
import { buildReviewContext, describeReviewContext, ReviewContext } from '../contract/contractProfile.service';
import {
  claimStage,
  getCurrentVersionWithText,
  setContractStatus,
  settledStatus,
} from '../contract/contractVersion.service';
import { LEGAL_SOURCE_CATALOG } from '../legal/legalSourceCatalog.data';
import { LegalChunkMatch, searchLegalChunks } from '../legal/legalRetrieval.service';
import { DOCUMENT_CHECKS } from './documentChecks.data';
import { countIssues, getContractPlaybook, IssueCountInput, IssueCounts, issueCountLine, playbookFieldLabel } from './playbook.service';
import { askJson, collectContractEvidence, ContractEvidence, EvidenceClause, FieldEvidence } from './playbookEvidence.service';
import { CheckResult, evaluateContract, PlaybookEvaluation } from './playbookEvaluation.service';
import { FALLBACK_RULE_PREFIX, FieldCondition, PLAYBOOK_VERSION } from './playbookSchema';
import { foldForMatch, locateQuote } from './quoteMatching';
import { AssessmentPoint, writeAssessment } from './reviewAssessment.service';

export type PlaybookReviewStage = 'collecting_evidence' | 'evaluating_checks' | 'preparing_suggestions' | 'saving_findings';

export const REFERRAL_LABEL = 'Đề nghị chuyên gia xem xét';

const MAX_REFERRALS = 3;
const REFERENCE_CANDIDATES = 3;
const LEGAL_CONCLUSION =
  /\b(dieu|khoan)\s+\d+|\b(bo )?luat (?!su\b)[a-z]|trai (phap )?luat|vo hieu|khong hop phap|(cao|thap) hon[^.]{0,40}(quy dinh|luat|phap luat)|vuot[^.]{0,25}(quy dinh|luat dinh|muc cho phep|gioi han)|(khong )?phu hop (voi )?(quy dinh|phap luat)/;
const MAX_SUGGESTIONS_PER_CALL = 15;
const TEMPLATE_BLANK_COUNT = 10;

interface LoadedClause extends EvidenceClause {
  id: Types.ObjectId;
  title?: string | null;
}

interface Referral {
  clauseIndex: number;
  concern: string;
  quote: string;
  startOffset: number;
  endOffset: number;
  reference?: { chunkId: string; citationLabel: string; articleRef?: string; score: number };
}

interface Suggestion {
  originalText?: string;
  revisedText: string;
  reason?: string;
}

const referralParser = z.object({
  concerns: z
    .array(z.object({ clauseIndex: z.number().int(), quote: z.string(), concern: z.string().min(1) }))
    .nullable()
    .optional(),
});

const referralCheckParser = z.object({
  checks: z.array(
    z.object({
      id: z.number().int(),
      answeredByContract: z.boolean(),
      excerpt: z.number().int().nullable().optional(),
    }),
  ),
});

const referralCheckResponse: Schema = {
  type: Type.OBJECT,
  properties: {
    checks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          answeredByContract: { type: Type.BOOLEAN },
          excerpt: { type: Type.INTEGER, nullable: true },
        },
        required: ['id', 'answeredByContract'],
      },
    },
  },
  required: ['checks'],
};

const referralResponse: Schema = {
  type: Type.OBJECT,
  properties: {
    concerns: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          clauseIndex: { type: Type.INTEGER },
          quote: { type: Type.STRING },
          concern: { type: Type.STRING },
        },
        required: ['clauseIndex', 'quote', 'concern'],
      },
    },
  },
  required: ['concerns'],
};

const suggestionParser = z.object({
  suggestions: z.array(
    z.object({
      id: z.string(),
      originalText: z.string().nullable().optional(),
      revisedText: z.string().nullable().optional(),
      reason: z.string().nullable().optional(),
    }),
  ),
});

const suggestionResponse: Schema = {
  type: Type.OBJECT,
  properties: {
    suggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          originalText: { type: Type.STRING, nullable: true },
          revisedText: { type: Type.STRING, nullable: true },
          reason: { type: Type.STRING, nullable: true },
        },
        required: ['id', 'revisedText'],
      },
    },
  },
  required: ['suggestions'],
};

interface ReportedSpan {
  clauseIndex?: number;
  title: string;
  quote?: string;
  startOffset?: number;
  endOffset?: number;
}

function reportedSpans(evaluation: PlaybookEvaluation): ReportedSpan[] {
  return [
    ...evaluation.results
      .filter((result) => result.outcome === 'failed' || result.outcome === 'unverified')
      .flatMap((result) => {
        const quoted = result.evidence.filter((field) => field.quote);
        return quoted.length
          ? quoted.map((field) => ({ clauseIndex: field.clauseIndex, title: result.title, quote: field.quote, startOffset: field.startOffset, endOffset: field.endOffset }))
          : [{ clauseIndex: result.clauseIndex, title: result.title }];
      }),
    ...evaluation.documentFindings.map((finding) => ({
      clauseIndex: finding.clauseIndex,
      title: finding.title,
      quote: finding.quote,
      startOffset: finding.startOffset,
      endOffset: finding.endOffset,
    })),
  ];
}

const overlapsSpan = (span: ReportedSpan, start: number, end: number) =>
  span.startOffset !== undefined && span.endOffset !== undefined && span.startOffset < end && start < span.endOffset;

function referralPrompt(
  context: ReviewContext,
  clauses: LoadedClause[],
  reported: ReportedSpan[],
  passed: string[],
  analysisFocus: string | undefined,
  redactor: Redactor,
) {
  const passedBlock = passed.length
    ? `\nThese criteria were ALSO checked and the contract meets them; do not question them again:\n${passed.map((title) => `- ${title}`).join('\n')}\n`
    : '';
  const reportedBlock = reported.length
    ? reported
        .map((span) => `- ${span.clauseIndex === undefined ? 'whole contract' : `clause index=${span.clauseIndex}`}: ${span.title}${span.quote ? ` ("${redactor.mask(span.quote)}")` : ''}`)
        .join('\n')
    : '- (nothing)';
  return `You assist a lawyer who will review a Vietnamese contract. These issues were ALREADY reported by fixed checks; do not raise them again, even in other words or about another clause:
${reportedBlock}
${passedBlock}
${describeReviewContext(context)}${analysisFocus ? `\nThe user asked to focus on: "${redactor.mask(analysisFocus)}"` : ''}

List at most ${MAX_REFERRALS} OTHER points where a lawyer's judgment could change what the user signs: a term that may not be enforceable as written, or that is unusually heavy or one-sided for the user's party, and that is not among the reported issues above.
Leave out standard wording that is normal in Vietnamese contracts (for example disputes going to "Toà án có thẩm quyền", or no governing-law clause between Vietnamese parties) and generic advice that a clause "should be more detailed".
Write each "concern" as ONE short Vietnamese question with full diacritics that the lawyer should answer, about this contract only. Do not answer it: never say a term is lawful, unlawful, higher or lower than the law allows, never name a law or an article, and never compute figures.
For each point return "clauseIndex", a "quote" copied word for word from that clause (one continuous passage) and "concern". Return an empty array when nothing stands out.${placeholderInstruction(redactor)}

Contract:
"""
${clauses.map((clause) => `[index=${clause.index}] ${redactor.mask(clause.text)}`).join('\n\n')}
"""`;
}

async function findReferrals(
  context: ReviewContext,
  clauses: LoadedClause[],
  evaluation: PlaybookEvaluation,
  analysisFocus: string | undefined,
  redactor: Redactor,
  signal?: AbortSignal,
): Promise<Referral[]> {
  const reported = reportedSpans(evaluation);
  const { concerns } = await askJson(
    referralPrompt(
      context,
      clauses,
      reported,
      evaluation.results.filter((result) => result.outcome === 'passed').map((result) => result.title),
      analysisFocus,
      redactor,
    ),
    referralResponse,
    referralParser,
    signal,
  );
  const referrals: Referral[] = [];
  for (const raw of (concerns ?? []).slice(0, MAX_REFERRALS)) {
    const clause = clauses.find((c) => c.index === raw.clauseIndex);
    const location = clause && locateQuote(clause.text, redactor.unmask(raw.quote));
    if (!clause || !location) continue;
    const start = clause.startOffset + location.start;
    const end = clause.startOffset + location.end;
    if (reported.some((span) => overlapsSpan(span, start, end))) continue;
    const concern = redactor.unmask(raw.concern).trim();
    if (LEGAL_CONCLUSION.test(foldForMatch(concern))) continue;
    referrals.push({
      clauseIndex: clause.index,
      concern,
      quote: clause.text.slice(location.start, location.end),
      startOffset: clause.startOffset + location.start,
      endOffset: clause.startOffset + location.end,
    });
  }
  if (referrals.length === 0) return referrals;

  const search = await searchLegalChunks(
    referrals.map((referral) => redactor.mask(`${referral.concern} ${referral.quote}`)),
    REFERENCE_CANDIDATES,
    { legalSourceCodes: context.legalSourceCodes, signal },
  );
  const items = referrals.map((referral, i) => ({ id: i, referral, candidates: search.matches[i] ?? [] }));
  const checks = await askJson(referralCheckPrompt(items, clauses, redactor), referralCheckResponse, referralCheckParser, signal)
    .then((result) => result.checks)
    .catch((err) => {
      if (signal?.aborted) throw err;
      logger.warn('Expert referral check failed; keeping them without references', {
        error: err instanceof Error ? err.message : String(err),
      });
      return undefined;
    });
  if (!checks) return referrals;
  return items.flatMap((item) => {
    const check = checks.find((candidate) => candidate.id === item.id);
    if (!check || check.answeredByContract) return [];
    const match = typeof check.excerpt === 'number' ? item.candidates[check.excerpt - 1] : undefined;
    if (match) item.referral.reference = { chunkId: match.chunkId, citationLabel: match.citationLabel, articleRef: match.articleRef, score: match.score };
    return [item.referral];
  });
}

function referralCheckPrompt(
  items: { id: number; referral: Referral; candidates: LegalChunkMatch[] }[],
  clauses: LoadedClause[],
  redactor: Redactor,
) {
  const blocks = items.map(
    ({ id, referral, candidates }) =>
      `[id=${id}] Clause index=${referral.clauseIndex}, quoted text: "${redactor.mask(referral.quote)}"\nQuestion for the lawyer: ${redactor.mask(referral.concern)}${candidates.length
        ? `\n${candidates
            .map((candidate, i) => `Excerpt ${i + 1} (${candidate.citationLabel}${candidate.articleRef ? `, ${candidate.articleRef}` : ''}): ${candidate.chunkText.slice(0, 1200)}`)
            .join('\n')}`
        : ''}`,
  );
  return `You check questions that will be sent to a lawyer about a Vietnamese contract. For each item:
- "answeredByContract": first find, anywhere in the whole contract below, every sentence about the topic of the question. Then set true when those sentences already answer the question, or when ANY claim inside the question misstates them (for example the question says something is missing, unclear, decided by one party alone, or has no exception, while the contract provides it, requires both parties to agree, or states the exception). Set false only when the contract really leaves the question open.
- "excerpt": the number of the ONE legal excerpt of that item whose provision directly governs the question (the lawyer would read it first to answer it), or null when no excerpt is directly about the question; an excerpt that only shares words or a general topic does not count.${placeholderInstruction(redactor)}

${blocks.join('\n\n')}

Contract:
"""
${clauses.map((clause) => `[index=${clause.index}] ${redactor.mask(clause.text)}`).join('\n\n')}
"""`;
}

interface SuggestionRequest {
  id: string;
  clause?: LoadedClause;
  issue: string;
  template?: string;
  insertNew: boolean;
}

function suggestionPrompt(context: ReviewContext, requests: SuggestionRequest[], redactor: Redactor) {
  const blocks = requests.map((request) =>
    request.insertNew
      ? `[id=${request.id}] The contract lacks this content: ${request.issue}\nDraft a new clause to insert.${request.template ? `\nModel wording: ${request.template}` : ''}`
      : `[id=${request.id}] Clause index=${request.clause?.index}:\n"""\n${redactor.mask(request.clause?.text ?? '')}\n"""\nIssue: ${request.issue}${request.template ? `\nModel wording: ${request.template}` : ''}`,
  );
  return `You draft fixes for issues found in a Vietnamese contract.

${describeReviewContext(context)}

For each item return "revisedText": the fixed wording in Vietnamese with full diacritics, in the style of the contract, and "reason": one short Vietnamese sentence about what the fix makes clear; never claim that the law or a regulation requires it. When the fix needs facts the contract does not give (a number of days, an amount, a date), keep a placeholder in square brackets such as [số ngày] instead of inventing a value.
For items with a clause, "originalText" MUST be the shortest passage copied word for word from that clause that the revised text replaces. For new clauses, set "originalText" to null.${placeholderInstruction(redactor)}

${blocks.join('\n\n')}`;
}

async function draftSuggestions(
  context: ReviewContext,
  requests: SuggestionRequest[],
  redactor: Redactor,
  signal?: AbortSignal,
): Promise<Map<string, Suggestion>> {
  const suggestions = new Map<string, Suggestion>();
  for (let start = 0; start < requests.length; start += MAX_SUGGESTIONS_PER_CALL) {
    signal?.throwIfAborted();
    const batch = requests.slice(start, start + MAX_SUGGESTIONS_PER_CALL);
    const result = await askJson(suggestionPrompt(context, batch, redactor), suggestionResponse, suggestionParser, signal);
    for (const raw of result.suggestions) {
      const request = batch.find((item) => item.id === raw.id);
      if (!request || !raw.revisedText) continue;
      let originalText: string | undefined;
      if (!request.insertNew && request.clause && raw.originalText) {
        const location = locateQuote(request.clause.text, redactor.unmask(raw.originalText));
        if (!location) continue;
        originalText = request.clause.text.slice(location.start, location.end);
      }
      suggestions.set(request.id, {
        originalText,
        revisedText: redactor.unmask(raw.revisedText).trim(),
        reason: raw.reason ? redactor.unmask(raw.reason).trim() : undefined,
      });
    }
  }
  return suggestions;
}

const formatValue = (value: unknown) => (typeof value === 'number' ? value.toLocaleString('vi-VN') : String(value));
const lowerFirst = (value: string) => value.charAt(0).toLocaleLowerCase('vi') + value.slice(1);

function articleCitation(result: CheckResult) {
  const article = result.legalArticles.find((item) => item.status === 'verified' && result.basis.kind === 'law');
  if (!article) return undefined;
  const { ref } = article;
  return `${ref.clause ? `khoản ${ref.clause} ` : ''}Điều ${ref.article} ${LEGAL_SOURCE_CATALOG[ref.sourceCode]}`;
}

function describeCondition(result: CheckResult, condition: FieldCondition) {
  const field = result.evidence.find((item) => item.key === condition.field);
  const { label, unit } = result.fields[condition.field] ?? { label: condition.field, unit: '' };
  switch (condition.op) {
    case 'is_true':
      return field?.quote ? `${label}: "${field.quote}".` : `${label}: có.`;
    case 'not_stated':
      return field?.blank ? `${label}: còn để trống.` : `${label}: hợp đồng không nêu.`;
    case 'greater_than':
    case 'less_than':
      return `${label}: ${formatValue(field?.value)}${unit} (${condition.op === 'greater_than' ? 'trên' : 'dưới'} ${formatValue(condition.value)}${unit}).`;
  }
}

function describeProblem(result: CheckResult, missingClause: boolean): string[] {
  const question = result.question ? [result.question] : [];
  const quoted = result.evidence.find((field) => field.quote);
  if (result.outcome === 'unverified') return [result.reason ?? 'Chưa xác minh được điều kiện áp dụng.'];
  if (result.vagueTerm && quoted) {
    return [`"${quoted.quote}" dùng cụm từ "${result.vagueTerm}", không cho biết cụ thể.`, ...question];
  }
  if (result.limit !== undefined && result.observed !== undefined) {
    const field = result.evidence[0];
    const { label, unit } = (field && result.fields[field.key]) ?? { label: 'Giá trị', unit: '' };
    const citation = articleCitation(result);
    const exceeds = result.limitKind === 'at_least' ? 'thấp hơn mức tối thiểu' : 'vượt mức tối đa';
    return [
      `${label} trong hợp đồng là ${formatValue(result.observed)}${unit}, ${exceeds} ${formatValue(result.limit)}${unit}${citation ? ` theo ${citation}` : ''}.`,
    ];
  }
  const required = articleCitation(result);
  const requiredBy = required ? [`Theo ${required}, hợp đồng phải có nội dung này.`] : [];
  if (missingClause) {
    const topic = result.title.replace(/^Hợp đồng phải có điều khoản về\s+/u, '');
    const subject = topic === result.title ? 'nội dung này' : topic;
    return [[`Không tìm thấy điều khoản nào về ${subject} trong hợp đồng.`, ...requiredBy].join(' '), ...question];
  }
  if (result.conditions) return [...result.conditions.map((condition) => describeCondition(result, condition)), ...question];
  const blank = result.evidence.filter((field) => field.blank);
  const absent = result.evidence.filter((field) => field.state === 'absent' && !field.blank);
  if (blank.length === 0 && absent.length === 0) return question.length ? question : [result.title];
  const lines = blank.map((field) => `${result.fields[field.key]?.label ?? field.key} còn để trống: "${field.quote}".`);
  if (absent.length > 0) {
    const labels = absent.map((field) => lowerFirst(result.fields[field.key]?.label ?? field.key));
    const missingWhat = `Không tìm thấy nội dung về ${labels.join(', ')} ở bất kỳ điều khoản nào của hợp đồng.`;
    lines.push(result.group === 'completeness' ? [missingWhat, ...requiredBy].join(' ') : missingWhat);
  }
  return [...lines, ...question];
}

function evidenceEntries(fields: FieldEvidence[]) {
  return fields
    .filter((field) => field.quote)
    .filter((field, i, all) => all.findIndex((other) => other.startOffset === field.startOffset && other.endOffset === field.endOffset) === i)
    .map((field) => ({
      fieldKey: field.key,
      label: playbookFieldLabel(field.key),
      quote: field.quote,
      clauseIndex: field.clauseIndex,
      startOffset: field.startOffset,
      endOffset: field.endOffset,
      value: field.value,
    }));
}

function legalBasisOf(result: CheckResult) {
  const entries: { text: string; legalKnowledgeChunkIds: string[]; verification: string; role: string }[] = [];
  if (result.basis.kind === 'law') {
    const chunkIds = result.legalArticles.flatMap((article) => (article.chunkId ? [article.chunkId] : []));
    const allVerified = result.legalArticles.every((article) => article.status === 'verified');
    entries.push({
      text: result.basis.statement,
      legalKnowledgeChunkIds: [...new Set(chunkIds)],
      verification: allVerified ? 'verified' : chunkIds.length ? 'partially_verified' : 'not_in_knowledge_base',
      role: 'basis',
    });
  } else if (result.legalArticles.length > 0) {
    entries.push({
      text: result.basis.statement,
      legalKnowledgeChunkIds: [...new Set(result.legalArticles.flatMap((article) => (article.chunkId ? [article.chunkId] : [])))],
      verification: 'verified',
      role: 'reference',
    });
  }
  if (result.fallback?.article.chunkId) {
    entries.push({
      text: `${FALLBACK_RULE_PREFIX}: ${result.fallback.statement}`,
      legalKnowledgeChunkIds: [result.fallback.article.chunkId],
      verification: 'verified',
      role: 'fallback',
    });
  }
  return entries;
}

function describeOutcome(
  counts: IssueCounts,
  coverage: PlaybookEvaluation['coverage'],
  blankCount: number,
  narrative: AssessmentPoint[],
) {
  const lines: string[] = [];
  if (blankCount >= TEMPLATE_BLANK_COUNT) {
    lines.push(`Hợp đồng còn ${blankCount} chỗ trống chưa điền, có thể đây là bản mẫu; các phép kiểm chỉ đánh giá được phần đã điền.`);
  }
  if (narrative.length > 0) {
    const sources = narrative.map((point, i) => ({ pointIndex: lines.length + i, checkCodes: point.checkCodes }));
    return { lines: [...lines, ...narrative.map((point) => point.text)], sources };
  }
  lines.push(issueCountLine(counts));
  if (counts.unverified) lines.push(`${counts.unverified} điểm chưa xác minh được điều kiện áp dụng.`);
  if (coverage.notChecked) lines.push(`${coverage.notChecked} phép kiểm không kiểm tra được vì thông tin trích từ hợp đồng chưa chắc chắn.`);
  if (counts.referrals) lines.push(`${counts.referrals} điểm được đề nghị chuyên gia xem xét thêm.`);
  return { lines, sources: [] };
}

function keyTermsOf(evidence: ContractEvidence, clauseIdByIndex: Map<number, Types.ObjectId>) {
  const entries = [
    ...evidence.playbooks.flatMap((group) =>
      Object.values(group.fields).map((field) => ({ key: `${group.playbook.clauseTypes[0]}.${field.key}`, field })),
    ),
    ...Object.values(evidence.contractFields).map((field) => ({ key: `contract.${field.key}`, field })),
  ];
  return entries
    .filter(({ field }) => field.state === 'stated' || field.state === 'deferred')
    .map(({ key, field }) => ({
      key,
      label: playbookFieldLabel(field.key),
      numberValue: typeof field.value === 'number' ? field.value : undefined,
      booleanValue: typeof field.value === 'boolean' ? field.value : undefined,
      textValue: typeof field.value === 'string' ? field.value : undefined,
      deferred: field.state === 'deferred' || undefined,
      clauseId: field.clauseIndex === undefined ? undefined : clauseIdByIndex.get(field.clauseIndex),
      quote: field.quote,
    }));
}

export async function runPlaybookReview(
  orgId: string,
  contractId: string,
  reviewId: string,
  analysisFocus?: string,
  onProgress?: (stage: PlaybookReviewStage) => void,
  signal?: AbortSignal,
) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) throw AppError.notFound('Không tìm thấy hợp đồng.');
  const currentVersion = await getCurrentVersionWithText(contractId);
  if (currentVersion.segmentationStatus !== 'completed') {
    throw AppError.badRequest('Hợp đồng chưa được tách điều khoản.');
  }
  const context = await buildReviewContext(contract);
  const redactor = createRedactor(currentVersion.extractedText ?? '', context.redactionPolicy);

  const version = await claimStage(currentVersion._id, 'riskDetection', {
    requireSegmented: true,
    set: analysisFocus ? { analysisFocus } : {},
    reviewId,
  });
  if (!version) throw AppError.conflict('Hợp đồng đang được phân tích bởi một yêu cầu khác.');
  await setContractStatus(contractId, orgId, 'processing');

  try {
    const clauseDocs = await ClauseModel.find({ contractVersionId: version._id, reviewId })
      .sort({ index: 1 })
      .populate<{ clauseTypeId: { code: ClauseCategory } }>('clauseTypeId');
    if (clauseDocs.length === 0) throw AppError.badRequest('Hợp đồng không có điều khoản để rà soát.');
    const clauses: LoadedClause[] = clauseDocs.map((clause) => ({
      id: clause._id,
      index: clause.index,
      title: clause.title,
      text: clause.text,
      startOffset: clause.startOffset,
      clauseTypes: [clause.clauseTypeId.code],
    }));
    const clauseByIndex = new Map(clauses.map((clause) => [clause.index, clause]));
    const focus = analysisFocus ?? version.analysisFocus ?? undefined;

    onProgress?.('collecting_evidence');
    const evidence = await collectContractEvidence({ context, clauses, redactor, signal });

    onProgress?.('evaluating_checks');
    const evaluation = await evaluateContract({
      contractType: context.profileCode,
      userParty: context.partyCode,
      clauses,
      evidence,
    });
    const reported = evaluation.results.filter((result) => result.outcome === 'failed' || result.outcome === 'unverified');
    const contractPlaybook = getContractPlaybook(context.profileCode);
    const expectedTypeOf = (result: CheckResult) => {
      const check = contractPlaybook?.checks.find((c) => c.code === result.code);
      return check?.test.kind === 'clause_present' ? check.test.clauseType : undefined;
    };
    const taxonomy = await getTaxonomyByCodes(reported.flatMap((result) => expectedTypeOf(result) ?? []));
    const taxonomyByCode = new Map(taxonomy.map((entry) => [entry.code as string, entry]));
    const problemOf = (result: CheckResult) => describeProblem(result, Boolean(expectedTypeOf(result)));

    signal?.throwIfAborted();
    onProgress?.('preparing_suggestions');
    const [{ referrals, narrative }, suggestions] = await Promise.all([
      findReferrals(context, clauses, evaluation, focus, redactor, signal)
        .catch((err) => {
          if (signal?.aborted) throw err;
          logger.warn('Expert referral step failed; continuing without referrals', { error: err instanceof Error ? err.message : String(err) });
          return [] as Referral[];
        })
        .then(async (found) => ({
          referrals: found,
          narrative: await writeAssessment({
            context,
            results: evaluation.results,
            documentFindings: evaluation.documentFindings,
            referrals: found,
            problemOf,
            redactor,
            signal,
          }).catch((err) => {
            if (signal?.aborted) throw err;
            logger.warn('Overall assessment step failed; using the template assessment', { error: err instanceof Error ? err.message : String(err) });
            return [] as AssessmentPoint[];
          }),
        })),
      draftSuggestions(
        context,
        [
          ...reported
            .filter((result) => result.outcome === 'failed')
            .map((result) => ({
              id: result.code,
              clause: result.clauseIndex === undefined ? undefined : clauseByIndex.get(result.clauseIndex),
              issue: `${result.title}. ${problemOf(result).join(' ')}`,
              template: result.suggestion,
              insertNew: result.clauseIndex === undefined,
            })),
          ...evaluation.documentFindings.map((finding, i) => ({
            id: `${finding.code}#${i}`,
            clause: clauseByIndex.get(finding.clauseIndex),
            issue: `${finding.title}. ${finding.detail}`,
            insertNew: false,
          })),
        ],
        redactor,
        signal,
      ).catch((err) => {
        if (signal?.aborted) throw err;
        logger.warn('Suggestion step failed; continuing without proposed revisions', { error: err instanceof Error ? err.message : String(err) });
        return new Map<string, Suggestion>();
      }),
    ]);

    signal?.throwIfAborted();
    onProgress?.('saving_findings');
    const clauseIdOf = (index?: number) => (index === undefined ? null : (clauseByIndex.get(index)?.id ?? null));

    const pending: { doc: Record<string, unknown>; chunkIds: string[]; scores: Map<string, number> }[] = [];
    for (const result of reported) {
      const expectedType = expectedTypeOf(result);
      const legalBasis = legalBasisOf(result);
      const suggestion = suggestions.get(result.code);
      pending.push({
        doc: {
          contractVersionId: version._id,
          reviewId,
          orgId,
          clauseId: clauseIdOf(result.clauseIndex),
          expectedClauseTypeId: expectedType ? (taxonomyByCode.get(expectedType)?._id ?? null) : null,
          findingType: expectedType ? 'missing_clause' : 'clause_risk',
          checkCode: result.code,
          checkGroup: result.group,
          outcome: result.outcome,
          label: result.label,
          playbookVersion: PLAYBOOK_VERSION,
          neutral: result.neutral,
          evidence: evidenceEntries(result.evidence),
          observed: result.observed,
          limit: result.limit,
          vagueTerm: result.vagueTerm,
          reason: result.reason,
          question: result.question,
          basis: { kind: result.basis.kind, statement: result.basis.statement },
          noVerifiedLegalBasis: result.noVerifiedLegalBasis,
          title: result.title,
          problem: problemOf(result),
          consequences: [result.whyItMatters],
          recommendations: result.suggestion ? [result.suggestion] : [],
          legalBasis,
          proposedRevision: suggestion,
          detectedBy: 'playbook',
        },
        chunkIds: [...new Set(legalBasis.flatMap((entry) => entry.legalKnowledgeChunkIds))],
        scores: new Map(),
      });
    }
    evaluation.documentFindings.forEach((finding, i) => {
      const check = DOCUMENT_CHECKS[finding.code];
      pending.push({
        doc: {
          contractVersionId: version._id,
          reviewId,
          orgId,
          clauseId: clauseIdOf(finding.clauseIndex),
          findingType: 'clause_risk',
          checkCode: finding.code,
          checkGroup: check.group,
          outcome: 'failed',
          label: finding.label,
          playbookVersion: PLAYBOOK_VERSION,
          evidence: [
            { quote: finding.quote, clauseIndex: finding.clauseIndex, startOffset: finding.startOffset, endOffset: finding.endOffset },
            ...(finding.relatedQuotes ?? []),
          ],
          question: check.question,
          basis: { kind: check.basis.kind, statement: check.basis.statement },
          noVerifiedLegalBasis: true,
          title: check.title,
          problem: [finding.detail, check.question],
          consequences: [check.whyItMatters],
          recommendations: [],
          proposedRevision: suggestions.get(`${finding.code}#${i}`),
          detectedBy: 'document_check',
        },
        chunkIds: [],
        scores: new Map(),
      });
    });
    for (const referral of referrals) {
      pending.push({
        doc: {
          contractVersionId: version._id,
          reviewId,
          orgId,
          clauseId: clauseIdOf(referral.clauseIndex),
          findingType: 'referral',
          checkGroup: 'referral',
          outcome: 'referral',
          label: REFERRAL_LABEL,
          playbookVersion: PLAYBOOK_VERSION,
          evidence: [
            { quote: referral.quote, clauseIndex: referral.clauseIndex, startOffset: referral.startOffset, endOffset: referral.endOffset },
          ],
          title: referral.concern,
          problem: [referral.concern],
          consequences: [],
          recommendations: [],
          noVerifiedLegalBasis: !referral.reference,
          legalBasis: referral.reference
            ? [
                {
                  text: `Điều luật có thể liên quan (tham khảo): ${referral.reference.citationLabel}${referral.reference.articleRef ? `, ${referral.reference.articleRef}` : ''}`,
                  legalKnowledgeChunkIds: [referral.reference.chunkId],
                  verification: 'unreferenced',
                  role: 'reference',
                },
              ]
            : [],
          detectedBy: 'expert_referral',
        },
        chunkIds: referral.reference ? [referral.reference.chunkId] : [],
        scores: new Map(referral.reference ? [[referral.reference.chunkId, referral.reference.score]] : []),
      });
    }

    const oldFindingIds = await RiskFindingModel.find({ contractVersionId: version._id, reviewId }).distinct('_id');
    const snapshots = await loadChunkSnapshots(pending.flatMap((item) => item.chunkIds));
    const inserted = pending.length ? await RiskFindingModel.insertMany(pending.map((item) => item.doc)) : [];
    const citations = inserted.flatMap((finding, i) =>
      pending[i].chunkIds.map((chunkId) => ({
        riskFindingId: finding._id,
        legalKnowledgeChunkId: chunkId,
        relevanceScore: pending[i].scores.get(chunkId) ?? 1,
        ...snapshots.get(chunkId),
      })),
    );
    if (citations.length) await RiskCitationModel.insertMany(citations);
    await RiskCitationModel.deleteMany({ riskFindingId: { $in: oldFindingIds } });
    await RiskFindingModel.deleteMany({ _id: { $in: oldFindingIds } });

    const issueCounts = countIssues(pending.map((item) => item.doc as IssueCountInput));
    const assessment = describeOutcome(
      issueCounts,
      evaluation.coverage,
      evaluation.documentFindings.reduce((sum, finding) => sum + (finding.blankCount ?? 0), 0),
      narrative,
    );
    const documentCheckCount = Object.keys(DOCUMENT_CHECKS).length;
    const uncoveredTaxonomy = await getTaxonomyByCodes(evaluation.coverage.clauseTypesWithoutPlaybook);
    const checkCoverage = {
      playbookVersion: PLAYBOOK_VERSION,
      ...evaluation.coverage,
      uncoveredTopics: uncoveredTaxonomy.map((entry) => ({ code: entry.code as string, name: entry.name })),
      documentChecks: documentCheckCount,
      notCheckedItems: evaluation.results
        .filter((result) => result.outcome === 'not_checked')
        .map((result) => ({ code: result.code, title: result.title, reason: result.reason })),
      passedItems: evaluation.results
        .filter((result) => result.outcome === 'passed')
        .map((result) => ({ code: result.code, title: result.title })),
    };
    await ContractVersionModel.updateOne(
      { _id: version._id },
      {
        $set: {
          riskDetectionStatus: 'completed',
          issueCounts,
          checkCoverage,
          overallAssessment: assessment.lines,
          assessmentSources: assessment.sources,
          keyTerms: keyTermsOf(evidence, new Map(clauses.map((clause) => [clause.index, clause.id]))),
          keyTermsExtractedAt: new Date(),
        },
        $unset: { riskDetectionError: '' },
      },
    );
    await setContractStatus(contractId, orgId, 'reviewed');
    return { issueCounts, checkCoverage };
  } catch (err) {
    await ContractVersionModel.updateOne(
      { _id: version._id },
      { $set: { riskDetectionStatus: 'failed', riskDetectionError: err instanceof Error ? err.message : 'Rà soát thất bại' } },
    );
    await setContractStatus(contractId, orgId, settledStatus(contract.status));
    throw err;
  }
}
