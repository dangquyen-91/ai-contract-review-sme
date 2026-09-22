import { AppError } from '../errors/AppError';
import { ClauseModel } from '../models/clause.model';
import { ContractModel } from '../models/contract.model';
import { summarizeContract } from './contractSummarization.service';

export async function generateContractSummary(orgId: string, contractId: string) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  if (contract.segmentationStatus !== 'completed') {
    throw AppError.badRequest('Contract clauses have not been segmented yet');
  }

  const clauses = await ClauseModel.find({ contractId: contract._id }).sort({ index: 1 });
  if (clauses.length === 0) {
    throw AppError.badRequest('Contract has no clauses to summarize');
  }

  contract.summaryStatus = 'processing';
  await contract.save();

  try {
    const summary = await summarizeContract(
      contract.type,
      clauses.map((c) => ({ category: c.category, summary: c.summary })),
    );

    contract.summary = summary;
    contract.summaryStatus = 'completed';
    contract.summaryError = undefined;
    await contract.save();
  } catch (err) {
    contract.summaryStatus = 'failed';
    contract.summaryError = err instanceof Error ? err.message : 'Summarization failed';
    await contract.save();
    throw err;
  }

  return contract;
}
