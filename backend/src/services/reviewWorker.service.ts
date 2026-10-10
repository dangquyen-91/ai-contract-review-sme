import { EventEmitter } from 'events';
import { Job, Queue, UnrecoverableError } from 'bullmq';
import { addJobWithTimeout, createQueue, createQueueEvents, createWorker } from '../config/queue';
import { logger } from '../config/logger';
import { AppError } from '../errors/AppError';
import { ClauseModel } from '../models/clause.model';
import { ContractVersionModel } from '../models/contractVersion.model';
import { RiskFindingModel } from '../models/riskFinding.model';
import { REVIEW_STAGES, ReviewModel } from '../models/review.model';
import { segmentClauses } from './clause.service';
import { generateContractSummary } from './summary.service';
import { detectRisks } from './risk.service';

const REVIEW_QUEUE = 'contract-review';
const MAX_ATTEMPTS = 2;
const WORKER_CONCURRENCY = 2;
const EXTRACTION_POLL_MS = 2000;
const EXTRACTION_WAIT_MS = 15 * 60 * 1000;
const ACTIVE_JOB_STATES = new Set(['waiting', 'active', 'delayed', 'prioritized', 'waiting-children']);
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

type ReviewStage = (typeof REVIEW_STAGES)[number];
type StageKey = 'segmentation' | 'summary' | 'riskDetection';

interface ReviewJobData {
  reviewId: string;
}

let queue: Queue<ReviewJobData> | undefined;
const getQueue = () => (queue ??= createQueue<ReviewJobData>(REVIEW_QUEUE));

export async function enqueueReview(reviewId: string) {
  return addJobWithTimeout(getQueue(), 'review', { reviewId }, {
    jobId: reviewId,
    attempts: MAX_ATTEMPTS,
    backoff: { type: 'exponential', delay: 15000 },
    removeOnComplete: { age: 7 * 24 * 3600 },
    removeOnFail: { age: 30 * 24 * 3600 },
  });
}

export async function isReviewJobAlive(reviewId: string): Promise<boolean> {
  const job = await getQueue().getJob(reviewId);
  if (!job) return false;
  return ACTIVE_JOB_STATES.has(await job.getState());
}

const reviewEvents = new EventEmitter();
reviewEvents.setMaxListeners(0);
let queueEventsStarted = false;

function ensureQueueEvents() {
  if (queueEventsStarted) return;
  queueEventsStarted = true;
  const events = createQueueEvents(REVIEW_QUEUE);
  for (const name of ['active', 'progress', 'completed', 'failed', 'delayed'] as const) {
    events.on(name, (args: { jobId: string }) => reviewEvents.emit(args.jobId));
  }
}

export function subscribeToReview(reviewId: string, listener: () => void): () => void {
  ensureQueueEvents();
  reviewEvents.on(reviewId, listener);
  return () => reviewEvents.off(reviewId, listener);
}

async function updateReview(job: Job<ReviewJobData>, set: Record<string, unknown>, unset: string[] = []) {
  await ReviewModel.updateOne(
    { _id: job.data.reviewId },
    { $set: set, ...(unset.length ? { $unset: Object.fromEntries(unset.map((k) => [k, ''])) } : {}) },
  );
  await job.updateProgress({ at: Date.now() });
}

function toJobError(err: unknown): Error {
  if (err instanceof AppError && err.statusCode < 500 && err.statusCode !== 409) {
    return new UnrecoverableError(err.message);
  }
  return err instanceof Error ? err : new Error(String(err));
}

async function runStage(
  job: Job<ReviewJobData>,
  key: StageKey,
  stage: ReviewStage | null,
  task: () => Promise<unknown>,
) {
  if (stage) {
    await updateReview(job, { [`stages.${key}`]: 'running', currentStage: stage }, ['stageDetail']);
  } else {
    await updateReview(job, { [`stages.${key}`]: 'running' });
  }
  try {
    await task();
    await updateReview(job, { [`stages.${key}`]: 'completed' });
  } catch (err) {
    await updateReview(job, { [`stages.${key}`]: 'failed' });
    throw toJobError(err);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForExtraction(job: Job<ReviewJobData>, versionId: string) {
  const deadline = Date.now() + EXTRACTION_WAIT_MS;
  let lastDetail: string | undefined;
  for (;;) {
    const version = await ContractVersionModel.findById(versionId).select('extractionStatus extractionProgress');
    if (!version) throw new UnrecoverableError('The contract was deleted');
    if (version.extractionStatus === 'completed') return;
    if (version.extractionStatus === 'pending') {
      throw new UnrecoverableError('The contract has no uploaded file to review');
    }
    if (version.extractionStatus !== 'processing') {
      throw new UnrecoverableError('The contract text could not be extracted; upload the file again');
    }
    if (Date.now() > deadline) throw new Error('Timed out waiting for text extraction to finish');

    const progress = version.extractionProgress;
    const detail = progress ? `${progress.processedPages}/${progress.totalPages} pages` : 'queued';
    if (detail !== lastDetail) {
      lastDetail = detail;
      await updateReview(job, { currentStage: 'waiting_for_extraction', stageDetail: detail });
    }
    await sleep(EXTRACTION_POLL_MS);
  }
}

async function buildReviewResult(versionId: string) {
  const [version, clauses, findings] = await Promise.all([
    ContractVersionModel.findById(versionId),
    ClauseModel.find({ contractVersionId: versionId }).select('index title'),
    RiskFindingModel.find({ contractVersionId: versionId }).select('findingType severity title clauseId'),
  ]);
  const clauseById = new Map(clauses.map((c) => [c._id.toString(), c]));
  const counts = { high: 0, medium: 0, low: 0 };
  for (const f of findings) counts[f.severity]++;

  return {
    overallRiskLevel: version?.overallRiskLevel ?? 'none',
    overallAssessment: version?.overallAssessment ?? [],
    summaryPoints: version?.summaryPoints ?? [],
    clauseCount: clauses.length,
    findingCounts: counts,
    findings: findings
      .map((f) => {
        const clause = f.clauseId ? clauseById.get(f.clauseId.toString()) : undefined;
        return {
          findingType: f.findingType,
          severity: f.severity,
          title: f.title,
          clauseIndex: clause?.index,
          clauseTitle: clause?.title ?? undefined,
        };
      })
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
  };
}

async function recordFailure(job: Job<ReviewJobData>, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const finalAttempt = err instanceof UnrecoverableError || job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
  logger.warn('Contract review attempt failed', {
    reviewId: job.data.reviewId,
    attempt: job.attemptsMade + 1,
    finalAttempt,
    error: message,
  });
  const update = finalAttempt
    ? {
        $set: { status: 'failed', error: message, finishedAt: new Date() },
        $unset: { activeLock: '', currentStage: '', stageDetail: '' },
      }
    : { $set: { error: message, stageDetail: 'retrying after an error' } };
  await ReviewModel.updateOne({ _id: job.data.reviewId }, update).catch(() => undefined);
}

async function processReview(job: Job<ReviewJobData>): Promise<void> {
  try {
    await runReview(job);
  } catch (err) {
    await recordFailure(job, err);
    throw err;
  }
}

async function runReview(job: Job<ReviewJobData>): Promise<void> {
  const review = await ReviewModel.findById(job.data.reviewId);
  if (!review || review.status === 'completed' || review.status === 'failed') return;

  const orgId = review.orgId.toString();
  const contractId = review.contractId.toString();
  const analysisFocus = review.analysisFocus ?? undefined;

  await updateReview(job, { status: 'running', startedAt: review.startedAt ?? new Date() }, ['error']);
  const versionId = review.versionId.toString();
  await waitForExtraction(job, versionId);

  if (review.stages?.segmentation !== 'completed') {
    await runStage(job, 'segmentation', 'segmentation', () => segmentClauses(orgId, contractId));
  }

  const parallel: Promise<void>[] = [];
  const riskPending = review.stages?.riskDetection !== 'completed';
  if (review.stages?.summary !== 'completed') {
    parallel.push(
      runStage(job, 'summary', riskPending ? null : 'summary', () =>
        generateContractSummary(orgId, contractId, analysisFocus),
      ),
    );
  }
  if (riskPending) {
    parallel.push(
      runStage(job, 'riskDetection', 'risk_detection', () =>
        detectRisks(orgId, contractId, analysisFocus, (detail) => {
          updateReview(job, { stageDetail: detail }).catch(() => undefined);
        }),
      ),
    );
  }
  const failure = (await Promise.allSettled(parallel)).find(
    (r): r is PromiseRejectedResult => r.status === 'rejected',
  );
  if (failure) throw failure.reason;

  await updateReview(
    job,
    { status: 'completed', finishedAt: new Date(), result: await buildReviewResult(versionId) },
    ['activeLock', 'currentStage', 'stageDetail', 'error'],
  );
}

export function startReviewWorker() {
  return createWorker<ReviewJobData, void>(REVIEW_QUEUE, processReview, {
    concurrency: WORKER_CONCURRENCY,
    lockDuration: 60000,
  });
}
