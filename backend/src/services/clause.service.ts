import { AppError } from '../errors/AppError';
import { ClauseModel } from '../models/clause.model';
import { ContractModel } from '../models/contract.model';
import { ContractVersionModel } from '../models/contractVersion.model';
import { RiskFindingModel } from '../models/riskFinding.model';
import { RiskCitationModel } from '../models/riskCitation.model';
import { segmentContractClauses } from './clauseSegmentation.service';
import {
  claimStage,
  getCurrentVersion,
  getCurrentVersionWithText,
  setContractStatus,
  settledStatus,
} from './contractVersion.service';
import { getTaxonomyIdByCode } from './clauseTypeTaxonomy.service';

export async function segmentClauses(orgId: string, contractId: string) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }

  const versionWithText = await getCurrentVersionWithText(contractId);
  const extractedText = versionWithText.extractedText;
  if (versionWithText.extractionStatus !== 'completed' || !extractedText) {
    throw AppError.badRequest('Contract text has not been extracted yet');
  }

  const versionId = versionWithText._id;
  const claimed = await claimStage(versionId, 'segmentation', {
    blockedBy: ['summary', 'riskDetection'],
  });
  if (!claimed) {
    throw AppError.conflict('Contract analysis is already running for this contract');
  }
  await setContractStatus(contractId, orgId, 'processing');

  try {
    const clauses = await segmentContractClauses(extractedText);
    const taxonomyIdByCode = await getTaxonomyIdByCode();

    const oldClauseIds = await ClauseModel.find({ contractVersionId: versionId }).distinct('_id');
    await ClauseModel.insertMany(
      clauses.map((clause) => ({
        contractVersionId: versionId,
        orgId,
        index: clause.index,
        title: clause.title,
        text: clause.text,
        startOffset: clause.startOffset,
        endOffset: clause.endOffset,
        clauseTypeId: taxonomyIdByCode.get(clause.category),
        summary: clause.summary,
      })),
    );

    const oldFindingIds = await RiskFindingModel.find({ contractVersionId: versionId }).distinct(
      '_id',
    );
    await RiskCitationModel.deleteMany({ riskFindingId: { $in: oldFindingIds } });
    await RiskFindingModel.deleteMany({ _id: { $in: oldFindingIds } });
    await ClauseModel.deleteMany({ _id: { $in: oldClauseIds } });

    await ContractVersionModel.updateOne(
      { _id: versionId },
      {
        $set: {
          segmentationStatus: 'completed',
          summaryStatus: 'pending',
          summaryPoints: [],
          riskDetectionStatus: 'pending',
          overallAssessment: [],
          overallRiskLevel: 'none',
        },
        $unset: { segmentationError: '', summaryError: '', riskDetectionError: '' },
      },
    );
    await setContractStatus(contractId, orgId, 'uploaded');
  } catch (err) {
    await ContractVersionModel.updateOne(
      { _id: versionId },
      {
        $set: {
          segmentationStatus: 'failed',
          segmentationError: err instanceof Error ? err.message : 'Segmentation failed',
        },
      },
    );
    await setContractStatus(contractId, orgId, settledStatus(contract.status));
    throw err;
  }

  return ClauseModel.find({ contractVersionId: versionId })
    .sort({ index: 1 })
    .populate('clauseTypeId');
}

export async function listClauses(orgId: string, contractId: string) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  const version = await getCurrentVersion(contractId);
  return ClauseModel.find({ contractVersionId: version._id })
    .sort({ index: 1 })
    .populate('clauseTypeId');
}
