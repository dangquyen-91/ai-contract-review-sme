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
import { searchLegalChunks } from '../legal/legalRetrieval.service';
import { DOCUMENT_CHECKS } from './documentChecks.data';
import { getContractPlaybook, playbookFieldLabel } from './playbook.service';
import { askJson, collectContractEvidence, ContractEvidence, EvidenceClause, FieldEvidence } from './playbookEvidence.service';
import { CheckResult, DocumentCheckResult, evaluateContract, PlaybookEvaluation } from './playbookEvaluation.service';
import { FALLBACK_RULE_PREFIX, PLAYBOOK_VERSION } from './playbookSchema';
import { locateQuote } from './quoteMatching';

export type PlaybookReviewStage = 'collecting_evidence' | 'evaluating_checks' | 'preparing_suggestions' | 'saving_findings';

export const REFERRAL_LABEL = 'Đề nghị chuyên gia xem xét';

const MAX_REFERRALS = 5;
const REFERRAL_MIN_SCORE = 0.5;
const MAX_SUGGESTIONS_PER_CALL = 15;

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
  analysisFocus: string | undefined,
  redactor: Redactor,
) {
  const reportedBlock = reported.length
    ? reported
        .map((span) => `- ${span.clauseIndex === undefined ? 'whole contract' : `clause index=${span.clauseIndex}`}: ${span.title}${span.quote ? ` ("${redactor.mask(span.quote)}")` : ''}`)
        .join('\n')
    : '- (nothing)';
  return `You assist a lawyer who will review a Vietnamese contract. These issues were ALREADY reported by fixed checks; do not mention them again, even in other words:
${reportedBlock}

${describeReviewContext(context)}${analysisFocus ? `\nThe user asked to focus on: "${redactor.mask(analysisFocus)}"` : ''}

List at most ${MAX_REFERRALS} OTHER points a lawyer should look at: terms that may conflict with Vietnamese law, or that are unusually heavy or one-sided, and that are not among the reported issues above. Never state that something is unlawful; describe it as a point to check.
For each point return "clauseIndex", a "quote" copied word for word from that clause (one continuous passage), and "concern": one short Vietnamese sentence with full diacritics saying what the lawyer should check. Return an empty array when nothing stands out.${placeholderInstruction(redactor)}

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
    referralPrompt(context, clauses, reported, analysisFocus, redactor),
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
    referrals.push({
      clauseIndex: clause.index,
      concern: redactor.unmask(raw.concern).trim(),
      quote: clause.text.slice(location.start, location.end),
      startOffset: clause.startOffset + location.start,
      endOffset: clause.startOffset + location.end,
    });
  }
  if (referrals.length === 0) return referrals;

  const search = await searchLegalChunks(
    referrals.map((referral) => redactor.mask(`${referral.concern} ${referral.quote}`)),
    1,
    { legalSourceCodes: context.legalSourceCodes, signal },
  );
  referrals.forEach((referral, i) => {
    const match = search.matches[i]?.[0];
    if (match && match.score >= REFERRAL_MIN_SCORE) {
      referral.reference = { chunkId: match.chunkId, citationLabel: match.citationLabel, articleRef: match.articleRef, score: match.score };
    }
  });
  return referrals;
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

For each item return "revisedText": the fixed wording in Vietnamese with full diacritics, in the style of the contract, and "reason": one short Vietnamese sentence. When the fix needs facts the contract does not give (a number of days, an amount, a date), keep a placeholder in square brackets such as [số ngày] instead of inventing a value.
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

function describeProblem(result: CheckResult): string[] {
  const quoted = result.evidence.find((field) => field.quote);
  if (result.outcome === 'unverified') return [result.reason ?? 'Chưa xác minh được điều kiện áp dụng.'];
  if (result.vagueTerm && quoted) {
    return [`"${quoted.quote}" dùng cụm từ "${result.vagueTerm}", không cho biết cụ thể.`, ...(result.question ? [result.question] : [])];
  }
  if (result.limit !== undefined && result.observed !== undefined) {
    return [`Hợp đồng ghi ${formatValue(result.observed)}; mức giới hạn là ${formatValue(result.limit)}.`];
  }
  if (result.code && result.evidence.length === 0 && result.group === 'completeness') {
    return ['Không tìm thấy điều khoản nào về nội dung này trong hợp đồng.', ...(result.question ? [result.question] : [])];
  }
  if (result.evidence.length > 0 && result.evidence.every((field) => field.state === 'absent')) {
    return ['Đã tìm trong toàn bộ hợp đồng nhưng không thấy nội dung này.', ...(result.question ? [result.question] : [])];
  }
  return result.question ? [result.question] : [result.title];
}

function evidenceEntries(fields: FieldEvidence[]) {
  return fields
    .filter((field) => field.quote)
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

function countIssues(results: CheckResult[], documents: DocumentCheckResult[], referrals: Referral[]) {
  const failed = (group: CheckResult['group']) => results.filter((r) => r.outcome === 'failed' && r.group === group).length;
  const counts = {
    violations: failed('compliance'),
    unclear: failed('clarity') + documents.length,
    missing: failed('completeness'),
    negotiable: failed('balance'),
    unverified: results.filter((r) => r.outcome === 'unverified').length,
    referrals: referrals.length,
  };
  return { ...counts, total: counts.violations + counts.unclear + counts.missing + counts.negotiable };
}

export function describeOutcome(
  counts: ReturnType<typeof countIssues>,
  coverage: PlaybookEvaluation['coverage'],
  documentCheckCount: number,
): string[] {
  const lines = [`Đã chạy ${coverage.checks} phép kiểm theo playbook ${PLAYBOOK_VERSION} và ${documentCheckCount} kiểm tra tự động trên toàn văn.`];
  if (counts.total === 0) lines.push('Không phát hiện vấn đề theo các tiêu chí đã kiểm tra.');
  else {
    const parts = [
      counts.violations ? `${counts.violations} vi phạm` : '',
      counts.unclear ? `${counts.unclear} chưa rõ ràng` : '',
      counts.missing ? `${counts.missing} thiếu nội dung` : '',
      counts.negotiable ? `${counts.negotiable} nên thương lượng` : '',
    ].filter(Boolean);
    lines.push(`Phát hiện ${counts.total} vấn đề: ${parts.join(', ')}.`);
  }
  if (counts.unverified) lines.push(`${counts.unverified} điểm chưa xác minh được điều kiện áp dụng.`);
  if (coverage.notChecked) lines.push(`${coverage.notChecked} phép kiểm không kiểm tra được vì thông tin trích từ hợp đồng chưa chắc chắn.`);
  if (counts.referrals) lines.push(`${counts.referrals} điểm được đề nghị chuyên gia xem xét thêm.`);
  return lines;
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

    signal?.throwIfAborted();
    onProgress?.('preparing_suggestions');
    const [referrals, suggestions] = await Promise.all([
      findReferrals(context, clauses, evaluation, focus, redactor, signal).catch((err) => {
        if (signal?.aborted) throw err;
        logger.warn('Expert referral step failed; continuing without referrals', { error: err instanceof Error ? err.message : String(err) });
        return [] as Referral[];
      }),
      draftSuggestions(
        context,
        [
          ...reported
            .filter((result) => result.outcome === 'failed')
            .map((result) => ({
              id: result.code,
              clause: result.clauseIndex === undefined ? undefined : clauseByIndex.get(result.clauseIndex),
              issue: `${result.title}. ${describeProblem(result).join(' ')}`,
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
    const contractPlaybook = getContractPlaybook(context.profileCode);
    const missingTypes = reported.flatMap((result) => {
      const check = contractPlaybook?.checks.find((c) => c.code === result.code);
      return check?.test.kind === 'clause_present' ? [check.test.clauseType] : [];
    });
    const taxonomyByCode = new Map((await getTaxonomyByCodes(missingTypes)).map((t) => [t.code, t._id]));
    const clauseIdOf = (index?: number) => (index === undefined ? null : (clauseByIndex.get(index)?.id ?? null));

    const pending: { doc: Record<string, unknown>; chunkIds: string[]; scores: Map<string, number> }[] = [];
    for (const result of reported) {
      const check = contractPlaybook?.checks.find((c) => c.code === result.code);
      const expectedType = check?.test.kind === 'clause_present' ? check.test.clauseType : undefined;
      const legalBasis = legalBasisOf(result);
      const suggestion = suggestions.get(result.code);
      pending.push({
        doc: {
          contractVersionId: version._id,
          reviewId,
          orgId,
          clauseId: clauseIdOf(result.clauseIndex),
          expectedClauseTypeId: expectedType ? (taxonomyByCode.get(expectedType) ?? null) : null,
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
          problem: describeProblem(result),
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
          checkGroup: 'clarity',
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

    const issueCounts = countIssues(reported, evaluation.documentFindings, referrals);
    const documentCheckCount = Object.keys(DOCUMENT_CHECKS).length;
    const checkCoverage = {
      playbookVersion: PLAYBOOK_VERSION,
      ...evaluation.coverage,
      documentChecks: documentCheckCount,
      notCheckedItems: evaluation.results
        .filter((result) => result.outcome === 'not_checked')
        .map((result) => ({ code: result.code, title: result.title, reason: result.reason })),
    };
    await ContractVersionModel.updateOne(
      { _id: version._id },
      {
        $set: {
          riskDetectionStatus: 'completed',
          issueCounts,
          checkCoverage,
          overallAssessment: describeOutcome(issueCounts, evaluation.coverage, documentCheckCount),
          keyTerms: keyTermsOf(evidence, new Map(clauses.map((clause) => [clause.index, clause.id]))),
          keyTermsExtractedAt: new Date(),
        },
        $unset: {
          riskDetectionError: '',
          overallRiskLevel: '',
          legalRetrievalStatus: '',
          ruleCheckStatus: '',
          legalCoverage: '',
        },
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
