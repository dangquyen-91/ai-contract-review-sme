import { Types } from 'mongoose';
import { AppError } from '../errors/AppError';
import { ClauseModel } from '../models/clause.model';
import { ContractModel } from '../models/contract.model';
import { ContractVersionModel } from '../models/contractVersion.model';
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

  // Summary and risk detection run concurrently on the same version document, so use atomic
  // updates instead of save() (which would fail with a VersionError on the whole-array writes).
  await ContractVersionModel.updateOne(
    { _id: version._id },
    { $set: { summaryStatus: 'processing', ...(analysisFocus ? { analysisFocus } : {}) } },
  );

  try {
    const summaryPoints = await summarizeContract(
      contract.type,
      clauses.map((c) => ({ category: c.clauseTypeId.code, summary: c.summary })),
      analysisFocus ?? version.analysisFocus ?? undefined,
    );

    await ContractVersionModel.updateOne(
      { _id: version._id },
      { $set: { summaryPoints, summaryStatus: 'completed' }, $unset: { summaryError: '' } },
    );
  } catch (err) {
    await ContractVersionModel.updateOne(
      { _id: version._id },
      {
        $set: {
          summaryStatus: 'failed',
          summaryError: err instanceof Error ? err.message : 'Summarization failed',
        },
      },
    );
    throw err;
  }

  const updatedVersion = await getCurrentVersion(contractId);
  return { ...contract.toObject(), currentVersion: updatedVersion.toObject() };
}
