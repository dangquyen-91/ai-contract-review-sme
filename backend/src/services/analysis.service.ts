import { AppError } from '../errors/AppError';
import { ContractModel } from '../models/contract.model';
import { getCurrentVersionWithText } from './contractVersion.service';
import { segmentClauses } from './clause.service';
import { generateContractSummary } from './summary.service';
import { detectRisks } from './risk.service';
import { getContractById } from './contract.service';
import { withUsage } from './usage.service';

export async function analyzeContract(
  input: {
    orgId: string;
    userId: string;
    contractId: string;
    idempotencyKey: string;
    analysisFocus?: string;
  },
  onProgress?: (stage: string) => void,
  signal?: AbortSignal,
) {
  if (!(await ContractModel.exists({ _id: input.contractId, orgId: input.orgId })))
    throw AppError.notFound('Contract not found');
  const version = await getCurrentVersionWithText(input.contractId);
  if (version.extractionStatus !== 'completed' || !version.extractedText?.trim()) {
    throw AppError.badRequest('Upload a valid contract with extracted text before analysis');
  }
  return withUsage(
    {
      ...input,
      kind: 'analysis',
      payload: { versionId: version.id, analysisFocus: input.analysisFocus ?? '' },
    },
    async (runSignal) => {
      onProgress?.('segmenting_clauses');
      await segmentClauses(input.orgId, input.contractId, runSignal);
      runSignal.throwIfAborted();
      onProgress?.('summarizing_contract');
      await generateContractSummary(input.orgId, input.contractId, input.analysisFocus, runSignal);
      runSignal.throwIfAborted();
      const findings = await detectRisks(
        input.orgId,
        input.contractId,
        input.analysisFocus,
        onProgress,
        runSignal,
      );
      runSignal.throwIfAborted();
      return { contract: await getContractById(input.orgId, input.contractId), findings };
    },
    signal,
  );
}
