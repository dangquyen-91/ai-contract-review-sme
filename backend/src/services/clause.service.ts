import { AppError } from '../errors/AppError';
import { ClauseModel } from '../models/clause.model';
import { ContractModel } from '../models/contract.model';
import { segmentContractClauses } from './clauseSegmentation.service';

export async function segmentClauses(orgId: string, contractId: string) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId }).select(
    '+extractedText',
  );
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  if (contract.extractionStatus !== 'completed' || !contract.extractedText) {
    throw AppError.badRequest('Contract text has not been extracted yet');
  }

  contract.segmentationStatus = 'processing';
  await contract.save();

  try {
    const clauses = await segmentContractClauses(contract.extractedText);

    await ClauseModel.deleteMany({ contractId: contract._id });
    if (clauses.length > 0) {
      await ClauseModel.insertMany(
        clauses.map((clause) => ({
          contractId: contract._id,
          orgId,
          index: clause.index,
          title: clause.title,
          text: clause.text,
          category: clause.category,
          summary: clause.summary,
        })),
      );
    }

    contract.segmentationStatus = 'completed';
    contract.segmentationError = undefined;
    await contract.save();
  } catch (err) {
    contract.segmentationStatus = 'failed';
    contract.segmentationError = err instanceof Error ? err.message : 'Segmentation failed';
    await contract.save();
    throw err;
  }

  return ClauseModel.find({ contractId: contract._id }).sort({ index: 1 });
}

export async function listClauses(orgId: string, contractId: string) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  return ClauseModel.find({ contractId }).sort({ index: 1 });
}
