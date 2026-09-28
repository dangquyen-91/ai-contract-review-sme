import { AppError } from '../errors/AppError';
import { ClauseModel } from '../models/clause.model';
import { ContractModel, RISK_LEVELS } from '../models/contract.model';
import { RiskFindingModel } from '../models/riskFinding.model';
import { RiskCitationModel } from '../models/riskCitation.model';
import { LegalKnowledgeChunkModel } from '../models/legalKnowledgeChunk.model';
import { LegalSourceModel } from '../models/legalSource.model';
import { detectContractRisks, LegalExcerptInput } from './riskDetection.service';
import { searchLegalChunks, LegalChunkMatch } from './legalRetrieval.service';

const SEVERITY_RANK: Record<(typeof RISK_LEVELS)[number], number> = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

const LEGAL_EXCERPTS_PER_CLAUSE = 3;

interface LegalExcerptMeta {
  chunkId: string;
  score: number;
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

  if (citations.length === 0) {
    return findings.map((f) => ({ ...f.toObject(), citations: [] }));
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
    ...f.toObject(),
    citations: citationsByFindingId.get((f._id as { toString(): string }).toString()) ?? [],
  }));
}

export async function detectRisks(orgId: string, contractId: string) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  if (contract.segmentationStatus !== 'completed') {
    throw AppError.badRequest('Contract clauses have not been segmented yet');
  }

  const clauses = await ClauseModel.find({ contractId: contract._id }).sort({ index: 1 });
  if (clauses.length === 0) {
    throw AppError.badRequest('Contract has no clauses to analyze');
  }

  contract.riskDetectionStatus = 'processing';
  await contract.save();

  try {
    const { excerpts, metaByNumber } = await buildLegalExcerpts(clauses);

    const findings = await detectContractRisks(
      contract.type,
      clauses.map((c) => ({ index: c.index, category: c.category, text: c.text })),
      excerpts,
    );

    const clauseIdByIndex = new Map(clauses.map((c) => [c.index, c._id]));

    const oldFindingIds = await RiskFindingModel.find({ contractId: contract._id }).distinct('_id');
    await RiskCitationModel.deleteMany({ riskFindingId: { $in: oldFindingIds } });
    await RiskFindingModel.deleteMany({ contractId: contract._id });

    let overallRiskLevel: (typeof RISK_LEVELS)[number] = 'none';
    const pending: { doc: Record<string, unknown>; citedExcerptNumbers: number[] }[] = [];
    for (const finding of findings) {
      if (SEVERITY_RANK[finding.severity] > SEVERITY_RANK[overallRiskLevel]) {
        overallRiskLevel = finding.severity;
      }

      if (finding.findingType === 'clause_risk') {
        const clauseId = clauseIdByIndex.get(finding.clauseIndex);
        if (!clauseId) continue; // LLM referenced a clause index that doesn't exist; skip it
        pending.push({
          doc: {
            contractId: contract._id,
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
      } else {
        pending.push({
          doc: {
            contractId: contract._id,
            orgId,
            expectedClauseCategory: finding.expectedClauseCategory,
            findingType: 'missing_clause' as const,
            severity: finding.severity,
            title: finding.title,
            explanation: finding.explanation,
            suggestedRevision: finding.suggestedRevision,
            detectedBy: 'llm' as const,
          },
          citedExcerptNumbers: finding.citedExcerptNumbers,
        });
      }
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

    contract.overallRiskLevel = overallRiskLevel;
    contract.riskDetectionStatus = 'completed';
    contract.riskDetectionError = undefined;
    await contract.save();
  } catch (err) {
    contract.riskDetectionStatus = 'failed';
    contract.riskDetectionError = err instanceof Error ? err.message : 'Risk detection failed';
    await contract.save();
    throw err;
  }

  const savedFindings = await RiskFindingModel.find({ contractId: contract._id }).sort({
    severity: 1,
    createdAt: 1,
  });
  return attachCitations(savedFindings);
}

export async function listRiskFindings(orgId: string, contractId: string) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  const findings = await RiskFindingModel.find({ contractId }).sort({ createdAt: 1 });
  return attachCitations(findings);
}
