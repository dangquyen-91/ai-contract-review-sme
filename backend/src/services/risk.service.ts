import { Types } from 'mongoose';
import { AppError } from '../errors/AppError';
import { ClauseModel } from '../models/clause.model';
import { ContractModel } from '../models/contract.model';
import { ContractVersionModel, RISK_LEVELS } from '../models/contractVersion.model';
import { RiskFindingModel } from '../models/riskFinding.model';
import { RiskCitationModel } from '../models/riskCitation.model';
import { LegalKnowledgeChunkModel } from '../models/legalKnowledgeChunk.model';
import { LegalSourceModel } from '../models/legalSource.model';
import {
  detectContractRisks,
  LegalExcerptInput,
  LlmFinding,
  LlmProposedRevision,
} from './riskDetection.service';
import { searchLegalChunks, LegalChunkMatch } from './legalRetrieval.service';
import { getCurrentVersion } from './contractVersion.service';
import { getMandatoryTaxonomyForContractType } from './clauseTypeTaxonomy.service';

const SEVERITY_RANK: Record<(typeof RISK_LEVELS)[number], number> = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

const MISSING_CLAUSE_SEVERITY: (typeof RISK_LEVELS)[number] = 'medium';

const LEGAL_EXCERPTS_PER_CLAUSE = 3;

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

async function buildLegalExcerpts(
  clauses: { text: string }[],
): Promise<{ excerpts: LegalExcerptInput[]; metaByNumber: Map<number, LegalExcerptMeta> }> {
  const perClauseMatches = await Promise.all(
    clauses.map((c) => searchLegalChunks(c.text, LEGAL_EXCERPTS_PER_CLAUSE)),
  );

  const matchByChunkId = new Map<string, LegalChunkMatch>();
  for (const matches of perClauseMatches) {
    for (const match of matches) {
      const existing = matchByChunkId.get(match.chunkId);
      if (!existing || match.score > existing.score) {
        matchByChunkId.set(match.chunkId, match);
      }
    }
  }

  const excerpts: LegalExcerptInput[] = [];
  const metaByNumber = new Map<number, LegalExcerptMeta>();
  let number = 1;
  for (const match of matchByChunkId.values()) {
    excerpts.push({
      number,
      citationLabel: match.citationLabel,
      articleRef: match.articleRef,
      text: match.chunkText,
    });
    metaByNumber.set(number, { chunkId: match.chunkId, score: match.score });
    number++;
  }

  return { excerpts, metaByNumber };
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

  const chunkIds = [...new Set(citations.map((c) => c.legalKnowledgeChunkId.toString()))];
  const chunks = await LegalKnowledgeChunkModel.find({ _id: { $in: chunkIds } });
  const sourceIds = [...new Set(chunks.map((c) => c.legalSourceId.toString()))];
  const sources = await LegalSourceModel.find({ _id: { $in: sourceIds } });

  const chunkById = new Map(chunks.map((c) => [c._id.toString(), c]));
  const sourceById = new Map(sources.map((s) => [s._id.toString(), s]));

  const citationsByFindingId = new Map<string, Record<string, unknown>[]>();
  for (const citation of citations) {
    const chunk = chunkById.get(citation.legalKnowledgeChunkId.toString());
    if (!chunk) continue;
    const source = sourceById.get(chunk.legalSourceId.toString());

    const key = citation.riskFindingId.toString();
    const list = citationsByFindingId.get(key) ?? [];
    list.push({
      legalKnowledgeChunkId: chunk._id.toString(),
      citationLabel: source?.citationLabel ?? 'Unknown',
      sourceTitle: source?.title ?? 'Unknown',
      articleRef: chunk.articleRef,
      chunkText: chunk.chunkText,
      relevanceScore: citation.relevanceScore,
    });
    citationsByFindingId.set(key, list);
  }

  return findings.map((f) => ({
    ...withClause(f),
    citations: citationsByFindingId.get((f._id as { toString(): string }).toString()) ?? [],
  }));
}

export type RiskDetectionStage = 'retrieving_legal_sources' | 'analyzing_clauses' | 'saving_findings';

// A version stuck in "processing" longer than this is assumed crashed and may be re-run.
const PROCESSING_STALE_MS = 10 * 60 * 1000;

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
) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }

  const currentVersion = await getCurrentVersion(contractId);
  if (currentVersion.segmentationStatus !== 'completed') {
    throw AppError.badRequest('Contract clauses have not been segmented yet');
  }

  const clauses = await ClauseModel.find({ contractVersionId: currentVersion._id })
    .sort({ index: 1 })
    .populate<{ clauseTypeId: PopulatedClauseType }>('clauseTypeId');
  if (clauses.length === 0) {
    throw AppError.badRequest('Contract has no clauses to analyze');
  }

  // Atomically claim the run so two concurrent requests cannot both rewrite the findings.
  const version = await ContractVersionModel.findOneAndUpdate(
    {
      _id: currentVersion._id,
      $or: [
        { riskDetectionStatus: { $ne: 'processing' } },
        { updatedAt: { $lt: new Date(Date.now() - PROCESSING_STALE_MS) } },
      ],
    },
    {
      $set: {
        riskDetectionStatus: 'processing',
        ...(analysisFocus ? { analysisFocus } : {}),
      },
    },
    { new: true },
  );
  if (!version) {
    throw AppError.conflict('Risk detection is already running for this contract');
  }

  try {
    const presentTaxonomyIds = new Set(clauses.map((c) => c.clauseTypeId._id.toString()));
    const mandatoryTaxonomy = await getMandatoryTaxonomyForContractType(contract.type);
    const missingTaxonomy = mandatoryTaxonomy.filter(
      (t) => !presentTaxonomyIds.has(t._id.toString()),
    );
    const missingByCode = new Map<string, (typeof missingTaxonomy)[number]>(
      missingTaxonomy.map((t) => [t.code, t]),
    );

    onProgress?.('retrieving_legal_sources');
    const { excerpts, metaByNumber } = await buildLegalExcerpts(clauses);

    onProgress?.('analyzing_clauses');
    const { overallAssessment, findings: llmFindings } = await detectContractRisks(
      contract.type,
      clauses.map((c) => ({ index: c.index, category: c.clauseTypeId.code, text: c.text })),
      excerpts,
      missingTaxonomy.map((t) => ({ code: t.code, name: t.name, description: t.description })),
      version.analysisFocus ?? undefined,
    );

    const clauseByIndex = new Map(clauses.map((c) => [c.index, c]));

    const toLegalBasis = (finding: LlmFinding) =>
      finding.legalBasis.map((b) => ({
        text: b.text,
        legalKnowledgeChunkIds: [
          ...new Set(
            b.citedExcerptNumbers
              .map((n) => metaByNumber.get(n)?.chunkId)
              .filter((id): id is string => Boolean(id)),
          ),
        ],
      }));

    const pending: { doc: Record<string, unknown>; chunkIds: string[] }[] = [];
    const coveredMissingCodes = new Set<string>();

    for (const finding of llmFindings) {
      const base = {
        contractVersionId: version._id,
        orgId,
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
          detectedBy: 'rule' as const,
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

    const inserted = pending.length > 0 ? await RiskFindingModel.insertMany(pending.map((p) => p.doc)) : [];

    const scoreByChunkId = new Map<string, number>();
    for (const meta of metaByNumber.values()) scoreByChunkId.set(meta.chunkId, meta.score);

    const citationDocs = inserted.flatMap((finding, i) =>
      pending[i].chunkIds.map((chunkId) => ({
        riskFindingId: finding._id,
        legalKnowledgeChunkId: chunkId,
        relevanceScore: scoreByChunkId.get(chunkId) ?? 0,
      })),
    );
    if (citationDocs.length > 0) {
      await RiskCitationModel.insertMany(citationDocs);
    }

    await RiskCitationModel.deleteMany({ riskFindingId: { $in: oldFindingIds } });
    await RiskFindingModel.deleteMany({ _id: { $in: oldFindingIds } });

    version.overallRiskLevel = overallRiskLevel;
    version.overallAssessment = overallAssessment;
    version.riskDetectionStatus = 'completed';
    version.riskDetectionError = undefined;
    await version.save();
    await ContractModel.updateOne({ _id: contractId, orgId }, { $set: { status: 'reviewed' } });
  } catch (err) {
    version.riskDetectionStatus = 'failed';
    version.riskDetectionError = err instanceof Error ? err.message : 'Risk detection failed';
    await version.save();
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
