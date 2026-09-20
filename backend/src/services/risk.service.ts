import { AppError } from '../errors/AppError';
import { ClauseModel } from '../models/clause.model';
import { ContractModel, RISK_LEVELS } from '../models/contract.model';
import { RiskFindingModel } from '../models/riskFinding.model';
import { detectContractRisks } from './riskDetection.service';

const SEVERITY_RANK: Record<(typeof RISK_LEVELS)[number], number> = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

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
    const findings = await detectContractRisks(
      contract.type,
      clauses.map((c) => ({ index: c.index, category: c.category, text: c.text })),
    );

    const clauseIdByIndex = new Map(clauses.map((c) => [c.index, c._id]));

    await RiskFindingModel.deleteMany({ contractId: contract._id });

    let overallRiskLevel: (typeof RISK_LEVELS)[number] = 'none';
    const docs = [];
    for (const finding of findings) {
      if (SEVERITY_RANK[finding.severity] > SEVERITY_RANK[overallRiskLevel]) {
        overallRiskLevel = finding.severity;
      }

      if (finding.findingType === 'clause_risk') {
        const clauseId = clauseIdByIndex.get(finding.clauseIndex);
        if (!clauseId) continue; // LLM referenced a clause index that doesn't exist; skip it
        docs.push({
          contractId: contract._id,
          orgId,
          clauseId,
          findingType: 'clause_risk' as const,
          severity: finding.severity,
          title: finding.title,
          explanation: finding.explanation,
          suggestedRevision: finding.suggestedRevision,
          detectedBy: 'llm' as const,
        });
      } else {
        docs.push({
          contractId: contract._id,
          orgId,
          expectedClauseCategory: finding.expectedClauseCategory,
          findingType: 'missing_clause' as const,
          severity: finding.severity,
          title: finding.title,
          explanation: finding.explanation,
          suggestedRevision: finding.suggestedRevision,
          detectedBy: 'llm' as const,
        });
      }
    }

    if (docs.length > 0) {
      await RiskFindingModel.insertMany(docs);
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

  return RiskFindingModel.find({ contractId: contract._id }).sort({ severity: 1, createdAt: 1 });
}

export async function listRiskFindings(orgId: string, contractId: string) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  return RiskFindingModel.find({ contractId }).sort({ createdAt: 1 });
}
