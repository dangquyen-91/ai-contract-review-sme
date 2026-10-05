import { Types } from 'mongoose';
import { AppError } from '../errors/AppError';
import { ClauseModel } from '../models/clause.model';
import { ContractModel } from '../models/contract.model';
import { RISK_LEVELS } from '../models/contractVersion.model';
import { RiskFindingModel } from '../models/riskFinding.model';
import { RiskCitationModel } from '../models/riskCitation.model';
import { LegalKnowledgeChunkModel } from '../models/legalKnowledgeChunk.model';
import { LegalSourceModel } from '../models/legalSource.model';
import { detectContractRisks, LegalExcerptInput } from './riskDetection.service';
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

  const version = await getCurrentVersion(contractId);
  if (version.segmentationStatus !== 'completed') {
    throw AppError.badRequest('Contract clauses have not been segmented yet');
  }

  const clauses = await ClauseModel.find({ contractVersionId: version._id })
    .sort({ index: 1 })
    .populate<{ clauseTypeId: PopulatedClauseType }>('clauseTypeId');
  if (clauses.length === 0) {
    throw AppError.badRequest('Contract has no clauses to analyze');
  }

  version.riskDetectionStatus = 'processing';
  if (analysisFocus) version.analysisFocus = analysisFocus;
  await version.save();

  try {
    onProgress?.('retrieving_legal_sources');
    const { excerpts, metaByNumber } = await buildLegalExcerpts(clauses);

    onProgress?.('analyzing_clauses');
    const llmFindings = await detectContractRisks(
      contract.type,
      clauses.map((c) => ({ index: c.index, category: c.clauseTypeId.code, text: c.text })),
      excerpts,
      version.analysisFocus ?? undefined,
    );

    const presentTaxonomyIds = new Set(clauses.map((c) => c.clauseTypeId._id.toString()));
    const mandatoryTaxonomy = await getMandatoryTaxonomyForContractType(contract.type);
    const missingTaxonomy = mandatoryTaxonomy.filter(
      (t) => !presentTaxonomyIds.has(t._id.toString()),
    );

    const clauseIdByIndex = new Map(clauses.map((c) => [c.index, c._id]));

    onProgress?.('saving_findings');
    const oldFindingIds = await RiskFindingModel.find({
      contractVersionId: version._id,
    }).distinct('_id');
    await RiskCitationModel.deleteMany({ riskFindingId: { $in: oldFindingIds } });
    await RiskFindingModel.deleteMany({ contractVersionId: version._id });

    let overallRiskLevel: (typeof RISK_LEVELS)[number] = 'none';
    const pending: { doc: Record<string, unknown>; citedExcerptNumbers: number[] }[] = [];

    for (const finding of llmFindings) {
      if (SEVERITY_RANK[finding.severity] > SEVERITY_RANK[overallRiskLevel]) {
        overallRiskLevel = finding.severity;
      }
      const clauseId = clauseIdByIndex.get(finding.clauseIndex);
      if (!clauseId) continue; // LLM referenced a clause index that doesn't exist; skip it
      pending.push({
        doc: {
          contractVersionId: version._id,
          orgId,
          clauseId,
          findingType: 'clause_risk' as const,
          severity: finding.severity,
          title: finding.title,
          explanation: finding.explanation,
          suggestedRevision: finding.suggestedRevision,
          detectedBy: 'llm' as const,
        },
        citedExcerptNumbers: finding.citedExcerptNumbers,
      });
    }

    if (SEVERITY_RANK[MISSING_CLAUSE_SEVERITY] > SEVERITY_RANK[overallRiskLevel] && missingTaxonomy.length > 0) {
      overallRiskLevel = MISSING_CLAUSE_SEVERITY;
    }
    for (const taxonomy of missingTaxonomy) {
      pending.push({
        doc: {
          contractVersionId: version._id,
          orgId,
          expectedClauseTypeId: taxonomy._id,
          findingType: 'missing_clause' as const,
          severity: MISSING_CLAUSE_SEVERITY,
          title: `Thieu dieu khoan ${taxonomy.name}`,
          explanation: `Hop dong loai nay thuong can co dieu khoan ve "${taxonomy.name}" (${taxonomy.description}), nhung khong tim thay dieu khoan nao thuoc loai nay trong hop dong.`,
          detectedBy: 'rule' as const,
        },
        citedExcerptNumbers: [],
      });
    }

    const inserted = pending.length > 0 ? await RiskFindingModel.insertMany(pending.map((p) => p.doc)) : [];

    const citationDocs = [];
    for (let i = 0; i < inserted.length; i++) {
      for (const num of pending[i].citedExcerptNumbers) {
        const meta = metaByNumber.get(num);
        if (!meta) continue;
        citationDocs.push({
          riskFindingId: inserted[i]._id,
          legalKnowledgeChunkId: meta.chunkId,
          relevanceScore: meta.score,
        });
      }
    }
    if (citationDocs.length > 0) {
      await RiskCitationModel.insertMany(citationDocs);
    }

    version.overallRiskLevel = overallRiskLevel;
    version.riskDetectionStatus = 'completed';
    version.riskDetectionError = undefined;
    await version.save();
  } catch (err) {
    version.riskDetectionStatus = 'failed';
    version.riskDetectionError = err instanceof Error ? err.message : 'Risk detection failed';
    await version.save();
    throw err;
  }

  const savedFindings = await RiskFindingModel.find({ contractVersionId: version._id })
    .sort({ severity: 1, createdAt: 1 })
    .populate('expectedClauseTypeId');
  return attachCitations(savedFindings);
}

export async function listRiskFindings(orgId: string, contractId: string) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  const version = await getCurrentVersion(contractId);
  const findings = await RiskFindingModel.find({ contractVersionId: version._id })
    .sort({ createdAt: 1 })
    .populate('expectedClauseTypeId');
  return attachCitations(findings);
}
