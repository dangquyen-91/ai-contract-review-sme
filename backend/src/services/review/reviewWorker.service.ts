import { EventEmitter } from 'events';
import { Job, Queue, UnrecoverableError } from 'bullmq';
import { addJobWithTimeout, createQueue, createQueueEvents, createWorker } from '../../config/queue';
import { logger } from '../../config/logger';
import { AppError } from '../../errors/AppError';
import { ClauseModel } from '../../models/clause.model';
import { ContractVersionModel } from '../../models/contractVersion.model';
import { RiskFindingModel } from '../../models/riskFinding.model';
import { REVIEW_STAGES, ReviewModel } from '../../models/review.model';
import { segmentClauses } from '../analysis/clause.service';
import { generateContractSummary } from '../analysis/summary.service';
import { detectRisks } from '../analysis/risk.service';
import { extendUsageLease, finishUsage, isUsageSucceeded, keepUsageLeaseAlive } from '../billing/usage.service';
import { reviewErrorCodeOf, reviewFailure, ReviewErrorCode, withReviewErrorCode } from './reviewErrors';

const REVIEW_QUEUE = 'contract-review';
const MAX_ATTEMPTS = 2;
const WORKER_CONCURRENCY = 2;
const EXTRACTION_POLL_MS = 2000;
const EXTRACTION_WAIT_MS = 15 * 60 * 1000;
const CANCEL_POLL_MS = 3000;
const ACTIVE_JOB_STATES = new Set(['waiting', 'active', 'delayed', 'prioritized', 'waiting-children']);
const UNFINISHED_STATUSES = ['queued', 'running'];
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

type ReviewStage = (typeof REVIEW_STAGES)[number];
type StageKey = 'segmentation' | 'summary' | 'riskDetection';

interface ReviewJobData {
  reviewId: string;
  orgId: string;
  usageRunId: string;
}

let queue: Queue<ReviewJobData> | undefined;
const getQueue = () => (queue ??= createQueue<ReviewJobData>(REVIEW_QUEUE));

export async function enqueueReview(data: ReviewJobData) {
  return addJobWithTimeout(getQueue(), 'review', data, {
    jobId: data.reviewId,
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

export async function removeIdleReviewJob(reviewId: string): Promise<boolean> {
  const job = await getQueue().getJob(reviewId);
  if (!job) return true;
  if ((await job.getState()) === 'active') return false;
  try {
    await job.remove();
    return true;
  } catch {
    return false;
  }
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
    return withReviewErrorCode(new UnrecoverableError(err.message), err);
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

async function waitForExtraction(job: Job<ReviewJobData>, versionId: string, signal: AbortSignal) {
  const deadline = Date.now() + EXTRACTION_WAIT_MS;
  let lastDetail: string | undefined;
  for (;;) {
    signal.throwIfAborted();
    const version = await ContractVersionModel.findById(versionId).select('extractionStatus extractionProgress');
    if (!version) throw reviewFailure('CONTRACT_DELETED', 'Hợp đồng đã bị xóa.');
    if (version.extractionStatus === 'completed') return;
    if (version.extractionStatus === 'pending') {
      throw reviewFailure('EXTRACTION_FAILED', 'Hợp đồng chưa có tệp để rà soát.');
    }
    if (version.extractionStatus !== 'processing') {
      throw reviewFailure('EXTRACTION_FAILED', 'Chưa đọc được nội dung hợp đồng. Vui lòng tải lại tệp.');
    }
    if (Date.now() > deadline) {
      throw reviewFailure('EXTRACTION_TIMEOUT', 'Đã quá thời gian chờ đọc nội dung hợp đồng. Vui lòng thử lại.', true);
    }

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
    RiskFindingModel.find({ contractVersionId: versionId }).select('findingType severity title clauseId detectedBy ruleCode'),
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
          detectedBy: f.detectedBy,
          ruleCode: f.ruleCode ?? undefined,
        };
      })
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
  };
}

type ReviewStages = { segmentation?: string | null; summary?: string | null; riskDetection?: string | null } | null | undefined;

async function buildPartialResult(versionId: string, stages: ReviewStages) {
  const summaryDone = stages?.summary === 'completed';
  const riskDone = stages?.riskDetection === 'completed';
  if (!summaryDone && !riskDone) return undefined;
  const result = await buildReviewResult(versionId);
  return {
    ...result,
    ...(summaryDone ? {} : { summaryPoints: [] }),
    ...(riskDone
      ? {}
      : { overallRiskLevel: 'none', overallAssessment: [], findingCounts: { high: 0, medium: 0, low: 0 }, findings: [] }),
    partial: true,
  };
}

export async function finishUnsuccessfulReview(reviewId: string, code: ReviewErrorCode, message: string) {
  const review = await ReviewModel.findById(reviewId);
  if (!review) return;
  if (UNFINISHED_STATUSES.includes(review.status)) {
    const partial = await buildPartialResult(review.versionId.toString(), review.stages).catch(() => undefined);
    await ReviewModel.updateOne(
      { _id: review._id, status: { $in: UNFINISHED_STATUSES } },
      {
        $set: {
          status: code === 'CANCELLED' ? 'cancelled' : 'failed',
          error: message,
          errorCode: code,
          finishedAt: new Date(),
          ...(partial ? { result: partial } : {}),
        },
        $unset: { activeLock: '', currentStage: '', stageDetail: '', cancelRequested: '' },
      },
    );
  }
  await finishUsage(review.orgId.toString(), review.usageRunId.toString(), false).catch((releaseErr) =>
    logger.warn('Failed to release the analysis credit of an unfinished review', {
      reviewId,
      error: releaseErr instanceof Error ? releaseErr.message : String(releaseErr),
    }),
  );
}

async function recordFailure(job: Job<ReviewJobData>, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const code = reviewErrorCodeOf(err);
  const finalAttempt = err instanceof UnrecoverableError || job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
  logger.warn('Contract review attempt failed', {
    reviewId: job.data.reviewId,
    attempt: job.attemptsMade + 1,
    finalAttempt,
    code,
    error: message,
  });
  if (!finalAttempt) {
    await ReviewModel.updateOne(
      { _id: job.data.reviewId },
      { $set: { error: message, errorCode: code, stageDetail: 'Đang thử lại sau lỗi' } },
    ).catch(() => undefined);
    return;
  }
  await finishUnsuccessfulReview(job.data.reviewId, code, message).catch((finishErr) =>
    logger.warn('Failed to record the end of an unsuccessful review', {
      reviewId: job.data.reviewId,
      error: finishErr instanceof Error ? finishErr.message : String(finishErr),
    }),
  );
}

export async function processReview(job: Job<ReviewJobData>): Promise<void> {
  try {
    await runReview(job);
  } catch (err) {
    await recordFailure(job, err);
    throw err;
  }
}

function watchReview(reviewId: string, usageRunId: string) {
  const controller = new AbortController();
  const abort = (reason: Error) => {
    if (!controller.signal.aborted) controller.abort(reason);
  };
  const stopLease = keepUsageLeaseAlive(usageRunId, () =>
    abort(reviewFailure('CREDIT_EXPIRED', 'Lượt đã giữ hết thời gian xử lý. Vui lòng bắt đầu lại yêu cầu rà soát.')),
  );
  const cancelPoll = setInterval(() => {
    ReviewModel.exists({ _id: reviewId, cancelRequested: true })
      .then((requested) => {
        if (requested) abort(reviewFailure('CANCELLED', 'Yêu cầu rà soát đã được hủy.'));
      })
      .catch(() => undefined);
  }, CANCEL_POLL_MS);
  cancelPoll.unref();
  return {
    signal: controller.signal,
    stop: () => {
      stopLease();
      clearInterval(cancelPoll);
    },
  };
}

async function runReview(job: Job<ReviewJobData>): Promise<void> {
  const review = await ReviewModel.findById(job.data.reviewId);
  if (!review || !UNFINISHED_STATUSES.includes(review.status)) return;
  if (review.cancelRequested) throw reviewFailure('CANCELLED', 'Yêu cầu rà soát đã được hủy.');

  const orgId = review.orgId.toString();
  const contractId = review.contractId.toString();
  const versionId = review.versionId.toString();
  const { usageRunId } = job.data;
  const analysisFocus = review.analysisFocus ?? undefined;

  let result: Awaited<ReturnType<typeof buildReviewResult>>;
  if (await isUsageSucceeded(usageRunId)) {
    result = await buildReviewResult(versionId);
  } else {
    if (!(await extendUsageLease(usageRunId))) {
      throw reviewFailure('CREDIT_EXPIRED', 'Lượt đã giữ hết hạn trước khi bắt đầu xử lý. Vui lòng gửi lại yêu cầu rà soát.');
    }
    const credit = watchReview(job.data.reviewId, usageRunId);
    try {
      await updateReview(job, { status: 'running', startedAt: review.startedAt ?? new Date() }, ['error']);
      await runStages(job, review.stages, { orgId, contractId, analysisFocus, versionId }, credit.signal);
      credit.signal.throwIfAborted();
      result = await buildReviewResult(versionId);
      await finishUsage(orgId, usageRunId, true, { reviewId: job.data.reviewId }, async session => {
        const completed = await ReviewModel.updateOne({ _id: review._id, usageRunId, status: { $in: UNFINISHED_STATUSES }, cancelRequested: { $ne: true } }, {
          $set: { status: 'completed', finishedAt: new Date(), result },
          $unset: { activeLock: '', currentStage: '', stageDetail: '', error: '', errorCode: '', cancelRequested: '' },
        }, { session });
        if (!completed.modifiedCount) throw reviewFailure('CANCELLED', 'Yêu cầu rà soát đã bị hủy trước khi hoàn tất.');
      });
    } catch (err) {
      throw credit.signal.aborted ? credit.signal.reason : err;
    } finally {
      credit.stop();
    }
  }

  await updateReview(
    job,
    { status: 'completed', finishedAt: new Date(), result },
    ['activeLock', 'currentStage', 'stageDetail', 'error', 'errorCode', 'cancelRequested'],
  );
}

interface StageInput {
  orgId: string;
  contractId: string;
  versionId: string;
  analysisFocus?: string;
}

async function runStages(
  job: Job<ReviewJobData>,
  stages: ReviewStages,
  { orgId, contractId, versionId, analysisFocus }: StageInput,
  signal: AbortSignal,
) {
  await waitForExtraction(job, versionId, signal);

  if (stages?.segmentation !== 'completed') {
    await runStage(job, 'segmentation', 'segmentation', () => segmentClauses(orgId, contractId, signal));
  }

  const parallel: Promise<void>[] = [];
  const riskPending = stages?.riskDetection !== 'completed';
  if (stages?.summary !== 'completed') {
    parallel.push(
      runStage(job, 'summary', riskPending ? null : 'summary', () =>
        generateContractSummary(orgId, contractId, analysisFocus, signal),
      ),
    );
  }
  if (riskPending) {
    parallel.push(
      runStage(job, 'riskDetection', 'risk_detection', () =>
        detectRisks(
          orgId,
          contractId,
          analysisFocus,
          (detail) => {
            updateReview(job, { stageDetail: detail }).catch(() => undefined);
          },
          signal,
        ),
      ),
    );
  }
  const failure = (await Promise.allSettled(parallel)).find(
    (r): r is PromiseRejectedResult => r.status === 'rejected',
  );
  if (failure) throw failure.reason;
}

export function startReviewWorker() {
  return createWorker<ReviewJobData, void>(REVIEW_QUEUE, processReview, {
    concurrency: WORKER_CONCURRENCY,
    lockDuration: 60000,
  });
}
