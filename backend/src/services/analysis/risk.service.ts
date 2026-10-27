import { Types } from 'mongoose';
import { AppError } from '../../errors/AppError';
import { ClauseModel } from '../../models/clause.model';
import { ContractModel } from '../../models/contract.model';
import { ContractVersionModel, RISK_LEVELS, RULE_CHECK_STATUSES } from '../../models/contractVersion.model';
import { RiskFindingModel } from '../../models/riskFinding.model';
import { RiskCitationModel } from '../../models/riskCitation.model';
import { LegalKnowledgeChunkModel } from '../../models/legalKnowledgeChunk.model';
import { LegalSourceModel } from '../../models/legalSource.model';
import {
  assessContractLevel,
  detectClauseBatchRisks,
  LegalExcerptInput,
  LlmFinding,
  LlmProposedRevision,
} from './riskDetection.service';
import { searchLegalChunks, LegalRetrievalStatus, verifyLegalBasis } from '../legal/legalRetrieval.service';
import {
  claimStage,
  getCurrentVersion,
  getCurrentVersionWithText,
  setContractStatus,
  settledStatus,
} from '../contract/contractVersion.service';
import { getTaxonomyByCodes } from './clauseTypeTaxonomy.service';
import { buildReviewContext } from '../contract/contractProfile.service';
import { createRedactor, Redactor } from '../ai/redaction.service';
import { ExtractedKeyTerm, extractKeyTerms } from './keyTermExtraction.service';
import { evaluateLegalRules, hasLegalRules, resolveRuleCitations, RuleFinding } from '../legal/legalRules.service';
import { ReviewContext } from '../contract/contractProfile.service';
import { logger } from '../../config/logger';

const SEVERITY_RANK: Record<(typeof RISK_LEVELS)[number], number> = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

const MISSING_CLAUSE_SEVERITY: (typeof RISK_LEVELS)[number] = 'medium';

const LEGAL_EXCERPTS_PER_CLAUSE = 3;

const MAX_BATCH_CLAUSES = 10;

const MAX_BATCH_CHARS = 15000;

const BATCH_CONCURRENCY = 3;

interface LegalExcerptMeta {
  chunkId: string;
  score: number;
}

interface PopulatedClauseType {
  _id: Types.ObjectId;
  code: string;
  name: string;
  description: string;
}

async function buildClauseExcerpts(
  clauses: { text: string }[],
  redactor: Redactor,
  legalSourceCodes: string[],
  signal?: AbortSignal,
): Promise<{
  excerptsByClause: LegalExcerptInput[][];
  metaByNumber: Map<number, LegalExcerptMeta>;
  retrievalStatus: LegalRetrievalStatus;
}> {
  const { matches: perClauseMatches, status: retrievalStatus } = await searchLegalChunks(
    clauses.map((c) => redactor.mask(c.text)),
    LEGAL_EXCERPTS_PER_CLAUSE,
    { legalSourceCodes, signal },
  );

  const numberByChunkId = new Map<string, number>();
  const metaByNumber = new Map<number, LegalExcerptMeta>();
  const excerptsByClause = clauses.map((_, i) =>
    (perClauseMatches[i] ?? []).map((match) => {
      let number = numberByChunkId.get(match.chunkId);
      if (number === undefined) {
        number = numberByChunkId.size + 1;
        numberByChunkId.set(match.chunkId, number);
        metaByNumber.set(number, { chunkId: match.chunkId, score: match.score });
      }
      return { number, citationLabel: match.citationLabel, articleRef: match.articleRef, text: match.chunkText };
    }),
  );

  return { excerptsByClause, metaByNumber, retrievalStatus };
}

function toBatches<T extends { text: string }>(items: T[]): T[][] {
  const batches: T[][] = [];
  let current: T[] = [];
  let chars = 0;
  for (const item of items) {
    if (current.length > 0 && (current.length >= MAX_BATCH_CLAUSES || chars + item.text.length > MAX_BATCH_CHARS)) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push(item);
    chars += item.text.length;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await task(items[i]);
      }
    }),
  );
  return results;
}

const ruleRiskCode = (finding: RuleFinding) => finding.rule.riskCode ?? 'UNLAWFUL_TERM';

async function extractKeyTermsSafely(
  context: ReviewContext,
  clauses: { index: number; text: string }[],
  redactor: Redactor,
  signal?: AbortSignal,
): Promise<ExtractedKeyTerm[] | null> {
  try {
    return await extractKeyTerms(context, clauses, redactor, signal);
  } catch (err) {
    if (signal?.aborted) throw err;
    logger.warn('Key term extraction failed, continuing without legal rule checks', {
      profile: context.profileCode,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

interface ChunkSnapshot {
  citationLabel: string;
  sourceTitle: string;
  articleRef?: string;
  chunkText: string;
}

async function loadChunkSnapshots(chunkIds: string[]): Promise<Map<string, ChunkSnapshot>> {
  const ids = [...new Set(chunkIds)];
  if (ids.length === 0) return new Map();
  const chunks = await LegalKnowledgeChunkModel.find({ _id: { $in: ids } }).select(
    'legalSourceId articleRef chunkText',
  );
  const sourceIds = [...new Set(chunks.map((c) => c.legalSourceId.toString()))];
  const sources = await LegalSourceModel.find({ _id: { $in: sourceIds } }).select('title citationLabel');
  const sourceById = new Map(sources.map((s) => [s._id.toString(), s]));

  return new Map(
    chunks.map((chunk) => {
      const source = sourceById.get(chunk.legalSourceId.toString());
      return [
        chunk._id.toString(),
        {
          citationLabel: source?.citationLabel ?? 'Unknown',
          sourceTitle: source?.title ?? 'Unknown',
          articleRef: chunk.articleRef ?? undefined,
          chunkText: chunk.chunkText,
        },
      ];
    }),
  );
}

async function attachCitations<T extends { _id: unknown; toObject: () => Record<string, unknown> }>(
  findings: T[],
) {
  const findingIds = findings.map((f) => f._id);
  const citations = await RiskCitationModel.find({ riskFindingId: { $in: findingIds } });

  const clauseIds = findings
    .map((f) => (f.toObject() as { clauseId?: Types.ObjectId | null }).clauseId)
    .filter((id): id is Types.ObjectId => Boolean(id));
  const clauseDocs =
    clauseIds.length > 0
      ? await ClauseModel.find({ _id: { $in: clauseIds } }).select('index title startOffset endOffset')
      : [];
  const clauseById = new Map(
    clauseDocs.map((c) => [
      c._id.toString(),
      { index: c.index, title: c.title, startOffset: c.startOffset, endOffset: c.endOffset },
    ]),
  );
  const withClause = (f: T) => {
    const obj = f.toObject() as { clauseId?: Types.ObjectId | null };
    return { ...obj, clause: obj.clauseId ? (clauseById.get(obj.clauseId.toString()) ?? null) : null };
  };

  if (citations.length === 0) {
    return findings.map((f) => ({ ...withClause(f), citations: [] }));
  }

  const current = await loadChunkSnapshots(citations.map((c) => c.legalKnowledgeChunkId.toString()));

  const citationsByFindingId = new Map<string, Record<string, unknown>[]>();
  for (const citation of citations) {
    const chunkId = citation.legalKnowledgeChunkId.toString();
    const live = current.get(chunkId);
    const snapshot: ChunkSnapshot | undefined = citation.chunkText
      ? {
          citationLabel: citation.citationLabel ?? 'Unknown',
          sourceTitle: citation.sourceTitle ?? 'Unknown',
          articleRef: citation.articleRef ?? undefined,
          chunkText: citation.chunkText,
        }
      : live;
    if (!snapshot) continue;

    const key = citation.riskFindingId.toString();
    const list = citationsByFindingId.get(key) ?? [];
    list.push({
      legalKnowledgeChunkId: chunkId,
      ...snapshot,
      relevanceScore: citation.relevanceScore,
      inKnowledgeBase: Boolean(live),
    });
    citationsByFindingId.set(key, list);
  }

  return findings.map((f) => ({
    ...withClause(f),
    citations: citationsByFindingId.get((f._id as { toString(): string }).toString()) ?? [],
  }));
}

export type RiskDetectionStage = 'retrieving_legal_sources' | 'analyzing_clauses' | 'saving_findings';

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

// The LLM must quote the sentence to replace verbatim; if it did not (or omitted it), fall back
// to the whole clause so the original/revised diff stays truthful.
function resolveProposedRevision(
  revision: LlmProposedRevision | undefined,
  clauseText?: string,
) {
  if (!revision) return undefined;
  const quoted = revision.originalText?.trim();
  let originalText: string | undefined;
  if (clauseText) {
    originalText =
      quoted && normalizeWhitespace(clauseText).includes(normalizeWhitespace(quoted))
        ? quoted
        : clauseText;
  }
  return { originalText, revisedText: revision.revisedText.trim(), reason: revision.reason };
}

function sortFindings<T extends { severity: (typeof RISK_LEVELS)[number]; createdAt?: Date }>(
  findings: T[],
) {
  return [...findings].sort(
    (a, b) =>
      SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
      (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0),
  );
}

export async function detectRisks(
  orgId: string,
  contractId: string,
  analysisFocus?: string,
  onProgress?: (stage: RiskDetectionStage) => void,
  signal?: AbortSignal,
) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }

  const currentVersion = await getCurrentVersionWithText(contractId);
  if (currentVersion.segmentationStatus !== 'completed') {
    throw AppError.badRequest('Contract clauses have not been segmented yet');
  }
  const reviewContext = await buildReviewContext(contract);
  const redactor = createRedactor(currentVersion.extractedText ?? '', reviewContext.redactionPolicy);

  // Atomically claim the run so two concurrent requests cannot both rewrite the findings.
  const version = await claimStage(currentVersion._id, 'riskDetection', {
    requireSegmented: true,
    set: analysisFocus ? { analysisFocus } : {},
  });
  if (!version) {
    throw AppError.conflict('Risk detection is already running or clauses are being re-segmented');
  }
  await setContractStatus(contractId, orgId, 'processing');

  try {
    const clauses = await ClauseModel.find({ contractVersionId: version._id })
      .sort({ index: 1 })
      .populate<{ clauseTypeId: PopulatedClauseType }>('clauseTypeId');
    if (clauses.length === 0) {
      throw AppError.badRequest('Contract has no clauses to analyze');
    }

    const presentTaxonomyIds = new Set(clauses.map((c) => c.clauseTypeId._id.toString()));
    const mandatoryTaxonomy = await getTaxonomyByCodes(reviewContext.mandatoryClauses);
    const missingTaxonomy = mandatoryTaxonomy.filter(
      (t) => !presentTaxonomyIds.has(t._id.toString()),
    );
    const missingByCode = new Map<string, (typeof missingTaxonomy)[number]>(
      missingTaxonomy.map((t) => [t.code, t]),
    );

    onProgress?.('retrieving_legal_sources');
    const [{ excerptsByClause, metaByNumber, retrievalStatus }, keyTerms] = await Promise.all([
      buildClauseExcerpts(clauses, redactor, reviewContext.legalSourceCodes, signal),
      extractKeyTermsSafely(
        reviewContext,
        clauses.map((c) => ({ index: c.index, text: c.text })),
        redactor,
        signal,
      ),
    ]);
    const ruleCheckStatus: (typeof RULE_CHECK_STATUSES)[number] = !hasLegalRules(reviewContext.profileCode)
      ? 'not_applicable'
      : keyTerms
        ? 'ok'
        : 'skipped';
    const ruleFindings = evaluateLegalRules(reviewContext, keyTerms ?? []);
    const ruleChunkIds = await resolveRuleCitations(ruleFindings);

    const analysisFocus = version.analysisFocus ?? undefined;
    const clauseInputs = clauses.map((c) => ({ index: c.index, category: c.clauseTypeId.code, text: c.text }));
    const ruleInputs = ruleFindings.map((r) => ({
      ruleCode: r.rule.code,
      clauseIndex: r.clauseIndex,
      title: r.title,
      problem: r.problem,
    }));

    signal?.throwIfAborted();
    onProgress?.('analyzing_clauses');
    const batchResults = await mapWithConcurrency(
      toBatches(clauseInputs.map((c, i) => ({ ...c, excerpts: excerptsByClause[i] }))),
      BATCH_CONCURRENCY,
      (batch) => {
        const indexes = new Set(batch.map((c) => c.index));
        return detectClauseBatchRisks(
          reviewContext,
          batch,
          ruleInputs.filter((r) => r.clauseIndex !== undefined && indexes.has(r.clauseIndex)),
          analysisFocus,
          redactor,
          signal,
        );
      },
    );
    const clauseFindings = batchResults.flatMap((r) => r.findings);

    signal?.throwIfAborted();
    const contractLevel = await assessContractLevel(
      reviewContext,
      clauseInputs,
      missingTaxonomy.map((t) => ({ code: t.code, name: t.name, description: t.description })),
      ruleInputs.filter((r) => r.clauseIndex === undefined),
      [
        ...ruleFindings.map((r) => ({
          clauseIndex: r.clauseIndex,
          riskCode: ruleRiskCode(r),
          severity: r.severity,
          title: r.title,
        })),
        ...clauseFindings.map((f) => ({
          clauseIndex: f.clauseIndex,
          riskCode: f.riskCode,
          severity: f.severity,
          title: f.title,
        })),
      ],
      analysisFocus,
      redactor,
      signal,
    );
    const { overallAssessment, coveredMissingCodes: llmCoveredMissingCodes } = contractLevel;
    const llmFindings = [...clauseFindings, ...contractLevel.findings];
    const ruleRevisions = [...batchResults.flatMap((r) => r.ruleRevisions), ...contractLevel.ruleRevisions];

    const clauseByIndex = new Map(clauses.map((c) => [c.index, c]));

    const basisCounts = llmFindings.map((f) => f.legalBasis.length);
    const verifiedBasis = await verifyLegalBasis(
      llmFindings.flatMap((f) =>
        f.legalBasis.map((b) => ({
          text: b.text,
          chunkIds: [
            ...new Set(
              b.citedExcerptNumbers
                .map((n) => metaByNumber.get(n)?.chunkId)
                .filter((id): id is string => Boolean(id)),
            ),
          ],
        })),
      ),
    );
    const legalBasisByFinding = new Map<LlmFinding, typeof verifiedBasis>();
    let basisCursor = 0;
    llmFindings.forEach((f, i) => {
      legalBasisByFinding.set(f, verifiedBasis.slice(basisCursor, basisCursor + basisCounts[i]));
      basisCursor += basisCounts[i];
    });
    const toLegalBasis = (finding: LlmFinding) => legalBasisByFinding.get(finding) ?? [];

    const pending: { doc: Record<string, unknown>; chunkIds: string[] }[] = [];
    const coveredMissingCodes = new Set<string>(llmCoveredMissingCodes);
    if (llmCoveredMissingCodes.length > 0) {
      logger.info('Mandatory clause types covered by misclassified clauses', {
        contractId,
        codes: llmCoveredMissingCodes,
      });
    }

    const revisionByRule = new Map(ruleRevisions.map((r) => [r.ruleCode, r]));
    for (const finding of ruleFindings) {
      const clause = finding.clauseIndex === undefined ? undefined : clauseByIndex.get(finding.clauseIndex);
      const resolvedCitations = ruleChunkIds.get(finding.rule.code);
      const chunkIds = resolvedCitations?.chunkIds ?? [];
      pending.push({
        doc: {
          contractVersionId: version._id,
          orgId,
          clauseId: clause?._id ?? null,
          findingType: 'clause_risk' as const,
          severity: finding.severity,
          title: finding.title,
          problem: finding.problem,
          consequences: finding.consequences,
          recommendations: finding.recommendations,
          legalBasis: [
            {
              text: finding.rule.legalBasis,
              legalKnowledgeChunkIds: chunkIds,
              verification: resolvedCitations?.verification ?? 'not_in_knowledge_base',
            },
          ],
          proposedRevision: resolveProposedRevision(revisionByRule.get(finding.rule.code), clause?.text),
          detectedBy: 'rule' as const,
          riskCode: ruleRiskCode(finding),
          ruleCode: finding.rule.code,
          ruleVersion: finding.rule.version,
        },
        chunkIds,
      });
    }

    for (const finding of llmFindings) {
      const base = {
        contractVersionId: version._id,
        orgId,
        riskCode: finding.riskCode,
        severity: finding.severity,
        title: finding.title,
        problem: finding.problem,
        consequences: finding.consequences,
        recommendations: finding.recommendations,
      };
      const legalBasis = toLegalBasis(finding);
      const chunkIds = [...new Set(legalBasis.flatMap((b) => b.legalKnowledgeChunkIds))];

      if (finding.missingClauseCode) {
        const taxonomy = missingByCode.get(finding.missingClauseCode);
        if (!taxonomy || coveredMissingCodes.has(taxonomy.code)) continue;
        coveredMissingCodes.add(taxonomy.code);
        pending.push({
          doc: {
            ...base,
            expectedClauseTypeId: taxonomy._id,
            findingType: 'missing_clause' as const,
            legalBasis,
            proposedRevision: resolveProposedRevision(finding.proposedRevision),
            detectedBy: 'hybrid' as const,
          },
          chunkIds,
        });
        continue;
      }

      const clause = finding.clauseIndex === undefined ? undefined : clauseByIndex.get(finding.clauseIndex);
      if (!clause) continue; // LLM referenced a clause index that doesn't exist; skip it
      pending.push({
        doc: {
          ...base,
          clauseId: clause._id,
          findingType: 'clause_risk' as const,
          legalBasis,
          proposedRevision: resolveProposedRevision(finding.proposedRevision, clause.text),
          detectedBy: 'llm' as const,
        },
        chunkIds,
      });
    }

    // Fallback: a missing clause the LLM skipped is still reported, with a generic template.
    for (const taxonomy of missingTaxonomy) {
      if (coveredMissingCodes.has(taxonomy.code)) continue;
      pending.push({
        doc: {
          contractVersionId: version._id,
          orgId,
          expectedClauseTypeId: taxonomy._id,
          findingType: 'missing_clause' as const,
          severity: MISSING_CLAUSE_SEVERITY,
          title: `Thiếu điều khoản ${taxonomy.name}`,
          problem: [
            `Hợp đồng loại này thường cần có điều khoản về "${taxonomy.name}" (${taxonomy.description}), nhưng không tìm thấy điều khoản nào thuộc loại này trong hợp đồng.`,
          ],
          detectedBy: 'checklist' as const,
          riskCode: 'MISSING_CLAUSE' as const,
        },
        chunkIds: [],
      });
    }

    let overallRiskLevel: (typeof RISK_LEVELS)[number] = 'none';
    for (const { doc } of pending) {
      const severity = doc.severity as (typeof RISK_LEVELS)[number];
      if (SEVERITY_RANK[severity] > SEVERITY_RANK[overallRiskLevel]) overallRiskLevel = severity;
    }

    // Insert the new findings before removing the old ones, so a failure leaves the old result intact.
    onProgress?.('saving_findings');
    const oldFindingIds = await RiskFindingModel.find({
      contractVersionId: version._id,
    }).distinct('_id');
    const snapshots = await loadChunkSnapshots(pending.flatMap((p) => p.chunkIds));

    const inserted = pending.length > 0 ? await RiskFindingModel.insertMany(pending.map((p) => p.doc)) : [];

    const scoreByChunkId = new Map<string, number>();
    for (const meta of metaByNumber.values()) scoreByChunkId.set(meta.chunkId, meta.score);
    for (const { chunkIds } of ruleChunkIds.values()) for (const id of chunkIds) scoreByChunkId.set(id, 1);

    const citationDocs = inserted.flatMap((finding, i) =>
      pending[i].chunkIds.map((chunkId) => ({
        riskFindingId: finding._id,
        legalKnowledgeChunkId: chunkId,
        relevanceScore: scoreByChunkId.get(chunkId) ?? 1,
        ...snapshots.get(chunkId),
      })),
    );
    if (citationDocs.length > 0) {
      await RiskCitationModel.insertMany(citationDocs);
    }

    await RiskCitationModel.deleteMany({ riskFindingId: { $in: oldFindingIds } });
    await RiskFindingModel.deleteMany({ _id: { $in: oldFindingIds } });

    // Atomic update: summary generation writes to the same version document concurrently.
    await ContractVersionModel.updateOne(
      { _id: version._id },
      {
        $set: {
          overallRiskLevel,
          overallAssessment,
          riskDetectionStatus: 'completed',
          legalRetrievalStatus: retrievalStatus,
          ruleCheckStatus,
          keyTerms: (keyTerms ?? []).map((t) => ({
            key: t.key,
            numberValue: t.numberValue,
            booleanValue: t.booleanValue,
            clauseId: t.clauseIndex === undefined ? undefined : clauseByIndex.get(t.clauseIndex)?._id,
            quote: t.quote,
          })),
          keyTermsExtractedAt: new Date(),
        },
        $unset: { riskDetectionError: '' },
      },
    );
    await setContractStatus(contractId, orgId, 'reviewed');
  } catch (err) {
    await ContractVersionModel.updateOne(
      { _id: version._id },
      {
        $set: {
          riskDetectionStatus: 'failed',
          riskDetectionError: err instanceof Error ? err.message : 'Risk detection failed',
        },
      },
    );
    await setContractStatus(contractId, orgId, settledStatus(contract.status));
    throw err;
  }

  const savedFindings = await RiskFindingModel.find({ contractVersionId: version._id }).populate(
    'expectedClauseTypeId',
  );
  return attachCitations(sortFindings(savedFindings));
}

export async function listRiskFindings(orgId: string, contractId: string) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  const version = await getCurrentVersion(contractId);
  const findings = await RiskFindingModel.find({ contractVersionId: version._id }).populate(
    'expectedClauseTypeId',
  );
  return attachCitations(sortFindings(findings));
}

async function loadFindingOfCurrentVersion(orgId: string, contractId: string, findingId: string) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  const version = await getCurrentVersion(contractId);
  const finding = await RiskFindingModel.findOne({
    _id: findingId,
    orgId,
    contractVersionId: version._id,
  }).populate('expectedClauseTypeId');
  if (!finding) {
    throw AppError.notFound('Risk finding not found');
  }
  return finding;
}

export async function updateProposedRevision(
  orgId: string,
  contractId: string,
  findingId: string,
  input: { revisedText?: string; reason?: string },
) {
  const finding = await loadFindingOfCurrentVersion(orgId, contractId, findingId);
  if (!finding.proposedRevision) {
    throw AppError.notFound('This finding has no proposed revision');
  }

  if (input.revisedText !== undefined) finding.proposedRevision.revisedText = input.revisedText;
  if (input.reason !== undefined) finding.proposedRevision.reason = input.reason;
  finding.proposedRevision.isEdited = true;
  await finding.save();

  return (await attachCitations([finding]))[0];
}

export async function removeProposedRevision(orgId: string, contractId: string, findingId: string) {
  const finding = await loadFindingOfCurrentVersion(orgId, contractId, findingId);
  finding.proposedRevision = undefined;
  await finding.save();

  return (await attachCitations([finding]))[0];
}
