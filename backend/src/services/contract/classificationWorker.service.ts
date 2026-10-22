import { Job, Queue, UnrecoverableError } from 'bullmq';
import { addJobWithTimeout, createQueue, createWorker } from '../../config/queue';
import { logger } from '../../config/logger';
import { AppError } from '../../errors/AppError';
import { classifyContract } from './contractClassification.service';

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
