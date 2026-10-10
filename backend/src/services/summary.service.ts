import { Types } from 'mongoose';
import { AppError } from '../errors/AppError';
import { ClauseModel } from '../models/clause.model';
import { ContractModel } from '../models/contract.model';
import { ContractVersionModel } from '../models/contractVersion.model';
import { summarizeContract } from './contractSummarization.service';
import { claimStage, getCurrentVersion, getCurrentVersionWithText } from './contractVersion.service';
import { buildReviewContext } from './contractProfile.service';
import { createRedactor } from './redaction.service';

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

  const version = await getCurrentVersionWithText(contractId);
  if (version.segmentationStatus !== 'completed') {
    throw AppError.badRequest('Contract clauses have not been segmented yet');
  }
  const reviewContext = await buildReviewContext(contract);
  const redactor = createRedactor(version.extractedText ?? '', reviewContext.redactionPolicy);

  const claimed = await claimStage(version._id, 'summary', {
    requireSegmented: true,
    set: analysisFocus ? { analysisFocus } : {},
  });
  if (!claimed) {
    throw AppError.conflict('Summary is already running or clauses are being re-segmented');
  }

  try {
    const clauses = await ClauseModel.find({ contractVersionId: version._id })
      .sort({ index: 1 })
      .populate<{ clauseTypeId: PopulatedClauseType }>('clauseTypeId');
    if (clauses.length === 0) {
      throw AppError.badRequest('Contract has no clauses to summarize');
    }

    const summaryPoints = await summarizeContract(
      reviewContext,
      clauses.map((c) => ({ category: c.clauseTypeId.code, summary: c.summary })),
      claimed.analysisFocus ?? undefined,
      redactor,
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
