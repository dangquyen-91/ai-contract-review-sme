import { HydratedDocument } from 'mongoose';
import { AppError } from '../errors/AppError';
import { ContractModel } from '../models/contract.model';
import { Review, ReviewModel } from '../models/review.model';
import { getCurrentVersion } from './contractVersion.service';
import { enqueueReview, isReviewJobAlive } from './reviewWorker.service';

function toReviewResponse(review: HydratedDocument<Review>) {
  const { activeLock: _activeLock, ...rest } = review.toObject();
  void _activeLock;
  return rest;
}

async function assertContractAccess(orgId: string, contractId: string) {
  const contract = await ContractModel.exists({ _id: contractId, orgId });
  if (!contract) throw AppError.notFound('Contract not found');
}

async function releaseLostActiveReview(contractId: string) {
  const active = await ReviewModel.findOne({ contractId, activeLock: true });
  if (!active || (await isReviewJobAlive(active.id))) return;
  await ReviewModel.updateOne(
    { _id: active._id, activeLock: true },
    {
      $set: { status: 'failed', error: 'The background job for this review was lost', finishedAt: new Date() },
      $unset: { activeLock: '', currentStage: '', stageDetail: '' },
    },
  );
}

interface StartReviewParams {
  orgId: string;
  userId: string;
  contractId: string;
  analysisFocus?: string;
}

export async function startReview({ orgId, userId, contractId, analysisFocus }: StartReviewParams) {
  await assertContractAccess(orgId, contractId);
  const version = await getCurrentVersion(contractId);
  if (version.extractionStatus === 'pending') {
    throw AppError.badRequest('The contract has no uploaded file to review');
  }
  if (version.extractionStatus === 'failed' || version.extractionStatus === 'unsupported') {
    throw AppError.badRequest('The contract text could not be extracted; upload the file again');
  }

  await releaseLostActiveReview(contractId);

  let review: HydratedDocument<Review>;
  try {
    review = await ReviewModel.create({
      contractId,
      versionId: version._id,
      orgId,
      requestedBy: userId,
      analysisFocus,
      activeLock: true,
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      const active = await ReviewModel.findOne({ contractId, activeLock: true }).select('_id');
      throw AppError.conflict(`A review is already running for this contract (review ${active?.id})`);
    }
    throw err;
  }

  try {
    await enqueueReview(review.id);
  } catch (err) {
    await ReviewModel.deleteOne({ _id: review._id });
    throw err;
  }
  return toReviewResponse(review);
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
