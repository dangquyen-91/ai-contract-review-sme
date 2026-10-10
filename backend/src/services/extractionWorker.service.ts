import { Job, Queue, QueueEvents } from 'bullmq';
import { createQueue, createQueueEvents, createWorker } from '../config/queue';
import { logger } from '../config/logger';
import { AppError } from '../errors/AppError';
import { ContractVersionModel } from '../models/contractVersion.model';
import { downloadContractFile, storedFileOf } from './storage.service';
import { extractContractText, ExtractionProgress, recycleOcrIfNeeded } from './textExtraction.service';

const EXTRACTION_QUEUE = 'contract-extraction';
const MAX_ATTEMPTS = 3;
const ENQUEUE_TIMEOUT_MS = 5000;
const SYNC_WAIT_TIMEOUT_MS = 10 * 60 * 1000;

interface ExtractionJobData {
  versionId: string;
}

interface ExtractionJobResult {
  status: string;
}

let queue: Queue<ExtractionJobData> | undefined;
let queueEvents: QueueEvents | undefined;

const getQueue = () => (queue ??= createQueue<ExtractionJobData>(EXTRACTION_QUEUE));
const getQueueEvents = () => (queueEvents ??= createQueueEvents(EXTRACTION_QUEUE));

export async function enqueueExtraction(versionId: string): Promise<Job<ExtractionJobData>> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new AppError('Background processing is unavailable, please try again later', 503)),
      ENQUEUE_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([
      getQueue().add(
        'extract',
        { versionId },
        {
          attempts: MAX_ATTEMPTS,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { age: 24 * 3600 },
          removeOnFail: { age: 7 * 24 * 3600 },
        },
      ),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function waitForExtraction(job: Job<ExtractionJobData>): Promise<void> {
  try {
    const events = getQueueEvents();
    await events.waitUntilReady();
    await job.waitUntilFinished(events, SYNC_WAIT_TIMEOUT_MS);
  } catch (err) {
    logger.warn('Contract extraction did not finish successfully while the upload was waiting', {
      jobId: job.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function markFailed(versionId: string, message: string) {
  await ContractVersionModel.updateOne(
    { _id: versionId },
    { $set: { extractionStatus: 'failed', extractionError: message }, $unset: { extractionProgress: '' } },
  );
}

async function processExtraction(job: Job<ExtractionJobData>): Promise<ExtractionJobResult> {
  const { versionId } = job.data;
  const version = await ContractVersionModel.findById(versionId);
  if (!version) return { status: 'skipped' };

  const file = storedFileOf(version);
  if (!file || !version.mimeType) {
    await markFailed(versionId, 'This contract version has no uploaded file to extract');
    return { status: 'failed' };
  }

  await ContractVersionModel.updateOne(
    { _id: versionId },
    {
      $set: { extractionStatus: 'processing', extractionStartedAt: new Date() },
      $unset: { extractionError: '', extractionProgress: '' },
    },
  );

  const buffer = await downloadContractFile(file);

  let progressWrites = Promise.resolve();
  const onProgress = (progress: ExtractionProgress) => {
    progressWrites = progressWrites
      .then(async () => {
        await job.updateProgress({ ...progress });
        await ContractVersionModel.updateOne({ _id: versionId }, { $set: { extractionProgress: progress } });
      })
      .catch(() => undefined);
  };

  const result = await extractContractText(buffer, version.mimeType, onProgress);
  await progressWrites;

  const fresh = await ContractVersionModel.findById(versionId);
  if (!fresh) return { status: 'skipped' };
  fresh.set({
    extractedText: result.text,
    extractionStatus: result.status,
    extractionError: result.error,
    extractionQuality: result.quality,
    extractionProgress: undefined,
  });
  await fresh.save();
  return { status: result.status };
}

export function startExtractionWorker() {
  const worker = createWorker<ExtractionJobData, ExtractionJobResult>(EXTRACTION_QUEUE, processExtraction, {
    concurrency: 1,
  });

  worker.on('failed', (job, err) => {
    if (!job) return;
    const finalAttempt = job.attemptsMade >= (job.opts.attempts ?? 1);
    logger.warn('Contract extraction attempt failed', {
      jobId: job.id,
      versionId: job.data.versionId,
      attempt: job.attemptsMade,
      finalAttempt,
      error: err.message,
    });
    if (finalAttempt) {
      markFailed(job.data.versionId, err.message).catch(() => undefined);
    }
  });

  worker.on('completed', () => {
    recycleOcrIfNeeded().catch((err) =>
      logger.warn('Failed to recycle OCR workers', { error: err instanceof Error ? err.message : String(err) }),
    );
  });

  return worker;
}
