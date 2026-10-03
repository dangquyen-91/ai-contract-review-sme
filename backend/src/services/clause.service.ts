import { AppError } from '../errors/AppError';
import { ClauseModel } from '../models/clause.model';
import { ContractModel } from '../models/contract.model';
import { segmentContractClauses } from './clauseSegmentation.service';
import { getCurrentVersion, getCurrentVersionWithText } from './contractVersion.service';
import { getTaxonomyIdByCode } from './clauseTypeTaxonomy.service';

export async function segmentClauses(orgId: string, contractId: string) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }

  const versionWithText = await getCurrentVersionWithText(contractId);
  if (versionWithText.extractionStatus !== 'completed' || !versionWithText.extractedText) {
    throw AppError.badRequest('Contract text has not been extracted yet');
  }

  versionWithText.segmentationStatus = 'processing';
  await versionWithText.save();

  try {
    const clauses = await segmentContractClauses(versionWithText.extractedText);
    const taxonomyIdByCode = await getTaxonomyIdByCode();

    await ClauseModel.deleteMany({ contractVersionId: versionWithText._id });
    if (clauses.length > 0) {
      await ClauseModel.insertMany(
        clauses.map((clause) => ({
          contractVersionId: versionWithText._id,
          orgId,
          index: clause.index,
          title: clause.title,
          text: clause.text,
          clauseTypeId: taxonomyIdByCode.get(clause.category),
          summary: clause.summary,
        })),
      );
    }

    versionWithText.segmentationStatus = 'completed';
    versionWithText.segmentationError = undefined;
    await versionWithText.save();
  } catch (err) {
    versionWithText.segmentationStatus = 'failed';
    versionWithText.segmentationError = err instanceof Error ? err.message : 'Segmentation failed';
    await versionWithText.save();
    throw err;
  }

  return ClauseModel.find({ contractVersionId: versionWithText._id })
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
