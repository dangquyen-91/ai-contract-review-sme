import { HydratedDocument } from 'mongoose';
import { AppError } from '../../errors/AppError';
import { logger } from '../../config/logger';
import { ContractModel } from '../../models/contract.model';
import { Review, ReviewModel } from '../../models/review.model';
import { getCurrentVersion } from '../contract/contractVersion.service';
import { enqueueReview, isReviewJobAlive } from './reviewWorker.service';
import { finishUsage, reserveUsage } from '../billing/usage.service';

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
      $set: { status: 'failed', error: 'The background job for this review was lost', finishedAt: new Date() },
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
