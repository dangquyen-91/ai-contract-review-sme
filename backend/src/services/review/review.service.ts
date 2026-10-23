import { HydratedDocument } from 'mongoose';
import { AppError } from '../../errors/AppError';
import { logger } from '../../config/logger';
import { ContractModel } from '../../models/contract.model';
import { Review, ReviewModel } from '../../models/review.model';
import { getCurrentVersion } from '../contract/contractVersion.service';
import {
  enqueueReview,
  finishUnsuccessfulReview,
  isReviewJobAlive,
  removeIdleReviewJob,
} from './reviewWorker.service';
import { finishUsage, reserveUsage } from '../billing/usage.service';
import { assertAccountReviewPolicy } from '../contract/personalReviewPolicy';

const REVIEW_LEASE_MS = 30 * 60 * 1000;

function toReviewResponse(review: HydratedDocument<Review>) {
  const { activeLock: _activeLock, usageRunId: _usageRunId, ...rest } = review.toObject();
  void _activeLock;
  void _usageRunId;
  return rest;
}

async function assertContractAccess(orgId: string, contractId: string) {
  const contract = await ContractModel.exists({ _id: contractId, orgId });
  if (!contract) throw AppError.notFound('Contract not found');
}

async function releaseReviewCredit(orgId: string, usageRunId: unknown) {
  if (!usageRunId) return;
  await finishUsage(orgId, String(usageRunId), false).catch((err) =>
    logger.warn('Failed to release the analysis credit of a review', {
      usageRunId: String(usageRunId),
      error: err instanceof Error ? err.message : String(err),
    }),
  );
}

async function releaseLostActiveReview(orgId: string, contractId: string) {
  const active = await ReviewModel.findOne({ contractId, activeLock: true });
  if (!active || (await isReviewJobAlive(active.id))) return;
  const released = await ReviewModel.updateOne(
    { _id: active._id, activeLock: true },
    {
      $set: {
        status: 'failed',
        error: 'The background job for this review was lost',
        errorCode: 'UNKNOWN',
        finishedAt: new Date(),
      },
      $unset: { activeLock: '', currentStage: '', stageDetail: '' },
    },
  );
  if (released.modifiedCount > 0) await releaseReviewCredit(orgId, active.usageRunId);
}

async function findReplay(orgId: string, contractId: string, idempotencyKey: string) {
  const existing = await ReviewModel.findOne({ orgId, idempotencyKey });
  if (!existing) return null;
  if (existing.contractId.toString() !== contractId) {
    throw AppError.conflict('Idempotency key was used for another request');
  }
  return existing;
}

interface StartReviewParams {
  orgId: string;
  userId: string;
  contractId: string;
  idempotencyKey: string;
  analysisFocus?: string;
}

export async function startReview({ orgId, userId, contractId, idempotencyKey, analysisFocus }: StartReviewParams) {
  await assertContractAccess(orgId, contractId);
  const replay = await findReplay(orgId, contractId, idempotencyKey);
  if (replay) return { review: toReviewResponse(replay), replayed: true };

  const version = await getCurrentVersion(contractId);
  if (version.extractionStatus === 'pending') {
    throw AppError.badRequest('The contract has no uploaded file to review');
  }
  if (version.extractionStatus === 'failed' || version.extractionStatus === 'unsupported') {
    throw AppError.badRequest('The contract text could not be extracted; upload the file again');
  }

  await releaseLostActiveReview(orgId, contractId);
  const active = await ReviewModel.findOne({ contractId, activeLock: true }).select('_id');
  if (active) throw AppError.conflict(`A review is already running for this contract (review ${active.id})`);

  const { run, replayed } = await reserveUsage(
    {
      orgId,
      userId,
      contractId,
      kind: 'analysis',
      idempotencyKey,
      payload: { versionId: version.id, analysisFocus: analysisFocus ?? '', via: 'review' },
    },
    new Date(),
    REVIEW_LEASE_MS,
  );
  if (replayed) throw AppError.conflict('Idempotency key was used for another request');

  let review: HydratedDocument<Review>;
  try {
    review = await ReviewModel.create({
      contractId,
      versionId: version._id,
      orgId,
      requestedBy: userId,
      idempotencyKey,
      usageRunId: run._id,
      analysisFocus,
      activeLock: true,
    });
  } catch (err) {
    await releaseReviewCredit(orgId, run._id);
    if ((err as { code?: number }).code === 11000) {
      const racedReplay = await findReplay(orgId, contractId, idempotencyKey);
      if (racedReplay) return { review: toReviewResponse(racedReplay), replayed: true };
      throw AppError.conflict('A review is already running for this contract');
    }
    throw err;
  }

  try {
    await enqueueReview({ reviewId: review.id, orgId, usageRunId: run.id });
  } catch (err) {
    await ReviewModel.deleteOne({ _id: review._id });
    await releaseReviewCredit(orgId, run._id);
    throw err;
  }
  return { review: toReviewResponse(review), replayed: false };
}

const RETRYABLE_STATUSES = ['failed', 'cancelled'];
const STAGE_KEYS = ['segmentation', 'summary', 'riskDetection'] as const;

export async function cancelReview(orgId: string, reviewId: string) {
  const review = await ReviewModel.findOne({ _id: reviewId, orgId });
  if (!review) throw AppError.notFound('Review not found');
  const requested = await ReviewModel.updateOne(
    { _id: review._id, status: { $in: ['queued', 'running'] } },
    { $set: { cancelRequested: true } },
  );
  if (!requested.matchedCount) throw AppError.conflict('The review has already finished', 'REVIEW_FINISHED');
  if (await removeIdleReviewJob(review.id)) {
    await finishUnsuccessfulReview(review.id, 'CANCELLED', 'The review was cancelled');
  }
  return getReview(orgId, reviewId);
}

interface RetryReviewParams {
  orgId: string;
  userId: string;
  reviewId: string;
  idempotencyKey: string;
  isPersonal: boolean;
}

export async function retryReview({ orgId, userId, reviewId, idempotencyKey, isPersonal }: RetryReviewParams) {
  const review = await ReviewModel.findOne({ _id: reviewId, orgId });
  if (!review) throw AppError.notFound('Review not found');
  if (!RETRYABLE_STATUSES.includes(review.status)) {
    throw AppError.conflict('Only failed or cancelled reviews can be retried', 'REVIEW_NOT_RETRYABLE');
  }
  const contractId = review.contractId.toString();
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) throw AppError.notFound('Contract not found');
  if (!contract.type) {
    throw AppError.conflict('Confirm the contract type before starting a review', 'CONTRACT_NOT_CONFIRMED');
  }
  assertAccountReviewPolicy(isPersonal, contract.type, contract.ourParty);
  const version = await getCurrentVersion(contractId);
  if (version.id !== review.versionId.toString()) {
    throw AppError.conflict('The contract has a newer version; start a new review', 'REVIEW_OUTDATED');
  }

  await releaseLostActiveReview(orgId, contractId);
  if (await ReviewModel.exists({ contractId, activeLock: true })) {
    throw AppError.conflict('A review is already running for this contract', 'REVIEW_RUNNING');
  }
  if (!(await removeIdleReviewJob(review.id))) {
    throw AppError.conflict('The previous attempt is still finishing; try again in a moment', 'REVIEW_BUSY');
  }

  const { run, replayed } = await reserveUsage(
    {
      orgId,
      userId,
      contractId,
      kind: 'analysis',
      idempotencyKey,
      payload: { reviewId, retry: true },
    },
    new Date(),
    REVIEW_LEASE_MS,
  );
  if (replayed) throw AppError.conflict('Idempotency key was used for another request');

  const resetStages = Object.fromEntries(
    STAGE_KEYS.filter((key) => review.stages?.[key] !== 'completed').map((key) => [`stages.${key}`, 'pending']),
  );
  let retried: HydratedDocument<Review> | null;
  try {
    retried = await ReviewModel.findOneAndUpdate(
      { _id: review._id, status: { $in: RETRYABLE_STATUSES } },
      {
        $set: { status: 'queued', activeLock: true, usageRunId: run._id, requestedBy: userId, ...resetStages },
        $unset: {
          error: '',
          errorCode: '',
          cancelRequested: '',
          finishedAt: '',
          result: '',
          currentStage: '',
          stageDetail: '',
        },
      },
      { new: true },
    );
  } catch (err) {
    await releaseReviewCredit(orgId, run._id);
    if ((err as { code?: number }).code === 11000) {
      throw AppError.conflict('A review is already running for this contract', 'REVIEW_RUNNING');
    }
    throw err;
  }
  if (!retried) {
    await releaseReviewCredit(orgId, run._id);
    throw AppError.conflict('Only failed or cancelled reviews can be retried', 'REVIEW_NOT_RETRYABLE');
  }

  try {
    await enqueueReview({ reviewId: retried.id, orgId, usageRunId: run.id });
  } catch (err) {
    await ReviewModel.updateOne(
      { _id: retried._id },
      {
        $set: { status: review.status, errorCode: review.errorCode ?? 'UNKNOWN', error: review.error, finishedAt: new Date() },
        $unset: { activeLock: '' },
      },
    );
    await releaseReviewCredit(orgId, run._id);
    throw err;
  }
  return toReviewResponse(retried);
}

export async function listReviews(orgId: string, contractId: string) {
  await assertContractAccess(orgId, contractId);
  const reviews = await ReviewModel.find({ contractId, orgId }).sort({ createdAt: -1 });
  return reviews.map(toReviewResponse);
}

export async function getReview(orgId: string, reviewId: string) {
  const review = await ReviewModel.findOne({ _id: reviewId, orgId });
  if (!review) throw AppError.notFound('Review not found');
  return toReviewResponse(review);
}
