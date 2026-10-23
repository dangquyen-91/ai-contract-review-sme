import { Job, Queue, UnrecoverableError } from 'bullmq';
import { addJobWithTimeout, createQueue, createWorker } from '../../config/queue';
import { logger } from '../../config/logger';
import { AppError } from '../../errors/AppError';
import { ContractModel } from '../../models/contract.model';
import { classificationClaimable, classifyContract } from './contractClassification.service';
import { getCurrentVersion } from './contractVersion.service';

const CLASSIFICATION_QUEUE = 'contract-classification';
const MAX_ATTEMPTS = 3;

interface ClassificationJobData {
  contractId: string;
}

let queue: Queue<ClassificationJobData> | undefined;
const getQueue = () => (queue ??= createQueue<ClassificationJobData>(CLASSIFICATION_QUEUE));

export async function enqueueClassification(contractId: string): Promise<Job<ClassificationJobData>> {
  return addJobWithTimeout(getQueue(), 'classify', { contractId }, {
    attempts: MAX_ATTEMPTS,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: { age: 24 * 3600 },
    removeOnFail: { age: 7 * 24 * 3600 },
  });
}

async function processClassification(job: Job<ClassificationJobData>): Promise<string | null> {
  try {
    return await classifyContract(job.data.contractId);
  } catch (err) {
    if (err instanceof AppError && err.statusCode < 500) throw new UnrecoverableError(err.message);
    throw err;
  }
}

export function startClassificationWorker() {
  const worker = createWorker<ClassificationJobData, string | null>(CLASSIFICATION_QUEUE, processClassification, {
    concurrency: 2,
  });
  worker.on('failed', (job, err) => {
    if (!job) return;
    logger.warn('Contract classification attempt failed', {
      contractId: job.data.contractId,
      attempt: job.attemptsMade,
      error: err.message,
    });
  });
  return worker;
}

export async function retryClassification(orgId: string, contractId: string) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) throw AppError.notFound('Contract not found');
  if (contract.type) {
    throw AppError.conflict('The contract type is already confirmed', 'CONTRACT_ALREADY_CONFIRMED');
  }
  const version = await getCurrentVersion(contractId);
  if (version.extractionStatus !== 'completed') {
    throw AppError.conflict('The contract text is not ready yet', 'EXTRACTION_NOT_READY');
  }
  const reset = await ContractModel.updateOne(
    { _id: contractId, type: null, ...classificationClaimable() },
    { $set: { 'classification.status': 'pending' }, $unset: { 'classification.error': '' } },
  );
  if (!reset.matchedCount) {
    throw AppError.conflict('Classification is already running or finished', 'CLASSIFICATION_NOT_RETRYABLE');
  }
  await enqueueClassification(contractId);
}
