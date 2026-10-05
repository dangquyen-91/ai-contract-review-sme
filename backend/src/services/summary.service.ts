import { Types } from 'mongoose';
import { AppError } from '../errors/AppError';
import { ClauseModel } from '../models/clause.model';
import { ContractModel } from '../models/contract.model';
import { summarizeContract } from './contractSummarization.service';
import { getCurrentVersion } from './contractVersion.service';

interface PopulatedClauseType {
  _id: Types.ObjectId;
  code: string;
}

export async function generateContractSummary(
  orgId: string,
  contractId: string,
  analysisFocus?: string,
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
    throw AppError.badRequest('Contract has no clauses to summarize');
  }

  version.summaryStatus = 'processing';
  if (analysisFocus) version.analysisFocus = analysisFocus;
  await version.save();

  try {
    const summaryPoints = await summarizeContract(
      contract.type,
      clauses.map((c) => ({ category: c.clauseTypeId.code, summary: c.summary })),
      version.analysisFocus ?? undefined,
    );

    version.summaryPoints = summaryPoints;
    version.summaryStatus = 'completed';
    version.summaryError = undefined;
    await version.save();
  } catch (err) {
    version.summaryStatus = 'failed';
    version.summaryError = err instanceof Error ? err.message : 'Summarization failed';
    await version.save();
    throw err;
  }

  return { ...contract.toObject(), currentVersion: version.toObject() };
}
