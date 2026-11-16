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
import { assertNoOpenVerification } from './verification.service';

const REVIEW_LEASE_MS = 30 * 60 * 1000;

function toReviewResponse(review: HydratedDocument<Review>) {
  const { activeLock: _activeLock, usageRunId: _usageRunId, ...rest } = review.toObject();
  void _activeLock;
  void _usageRunId;
  return rest;
}

async function assertContractAccess(orgId: string, contractId: string) {
  const contract = await ContractModel.exists({ _id: contractId, orgId });
  if (!contract) throw AppError.notFound('Không tìm thấy hợp đồng.');
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
        error: 'Tác vụ rà soát đã bị gián đoạn. Vui lòng thử lại.',
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
    throw AppError.conflict('Mã yêu cầu đã được dùng cho hợp đồng khác. Vui lòng tải lại và thử lại.');
  }
  return existing;
}

interface StartReviewParams {
  orgId: string;
  userId: string;
  contractId: string;
  idempotencyKey: string;
  analysisFocus?: string;
  billing?: { versionId: string; units: number };
}

export async function startReview({ orgId, userId, contractId, idempotencyKey, analysisFocus, billing }: StartReviewParams) {
  await assertContractAccess(orgId, contractId);
  const replay = await findReplay(orgId, contractId, idempotencyKey);
  if (replay) return { review: toReviewResponse(replay), replayed: true };

  const version = await getCurrentVersion(contractId);
  if (billing && billing.versionId !== version.id) throw AppError.conflict('Phiên bản hợp đồng đã thay đổi. Vui lòng kiểm tra lại số trang.', 'REVIEW_QUOTE_CHANGED');
  if (version.extractionStatus === 'pending') {
    throw AppError.badRequest('Hợp đồng chưa có tệp để rà soát. Vui lòng tải tệp lên trước.');
  }
  if (version.extractionStatus === 'failed' || version.extractionStatus === 'unsupported') {
    throw AppError.badRequest('Chưa đọc được nội dung hợp đồng. Vui lòng tải lại tệp.');
  }

  await assertNoOpenVerification(contractId);
  await releaseLostActiveReview(orgId, contractId);
  const active = await ReviewModel.findOne({ contractId, activeLock: true }).select('_id');
  if (active) throw AppError.conflict('Hợp đồng đang được rà soát. Vui lòng chờ yêu cầu hiện tại hoàn tất.', 'REVIEW_RUNNING');

  const { run, replayed } = await reserveUsage(
    {
      orgId,
      userId,
      contractId,
      kind: 'analysis',
      versionId: version.id,
      confirmedUnits: billing?.units,
      idempotencyKey,
      payload: { versionId: version.id, analysisFocus: analysisFocus ?? '', via: 'review' },
    },
    new Date(),
    REVIEW_LEASE_MS,
  );
  if (replayed) throw AppError.conflict('Mã yêu cầu đã được dùng cho thao tác khác. Vui lòng tải lại và thử lại.');

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
      throw AppError.conflict('Hợp đồng đang được rà soát. Vui lòng chờ yêu cầu hiện tại hoàn tất.', 'REVIEW_RUNNING');
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
  if (!review) throw AppError.notFound('Không tìm thấy yêu cầu rà soát.');
  const requested = await ReviewModel.updateOne(
    { _id: review._id, status: { $in: ['queued', 'running'] } },
    { $set: { cancelRequested: true } },
  );
  if (!requested.matchedCount) throw AppError.conflict('Yêu cầu rà soát đã kết thúc.', 'REVIEW_FINISHED');
  if (await removeIdleReviewJob(review.id)) {
    await finishUnsuccessfulReview(review.id, 'CANCELLED', 'Yêu cầu rà soát đã được hủy.');
  }
  return getReview(orgId, reviewId);
}

interface RetryReviewParams {
  orgId: string;
  userId: string;
  reviewId: string;
  idempotencyKey: string;
  isPersonal: boolean;
  billing?: { versionId: string; units: number };
}

export async function retryReview({ orgId, userId, reviewId, idempotencyKey, isPersonal, billing }: RetryReviewParams) {
  const review = await ReviewModel.findOne({ _id: reviewId, orgId });
  if (!review) throw AppError.notFound('Không tìm thấy yêu cầu rà soát.');
  if (!RETRYABLE_STATUSES.includes(review.status)) {
    throw AppError.conflict('Chỉ có thể thử lại yêu cầu rà soát đã thất bại hoặc bị hủy.', 'REVIEW_NOT_RETRYABLE');
  }
  const contractId = review.contractId.toString();
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) throw AppError.notFound('Không tìm thấy hợp đồng.');
  if (!contract.type) {
    throw AppError.conflict('Vui lòng xác nhận loại hợp đồng trước khi bắt đầu rà soát.', 'CONTRACT_NOT_CONFIRMED');
  }
  assertAccountReviewPolicy(isPersonal, contract.type, contract.ourParty);
  const version = await getCurrentVersion(contractId);
  if (version.id !== review.versionId.toString()) {
    throw AppError.conflict('Hợp đồng đã có phiên bản mới. Vui lòng bắt đầu lượt rà soát mới.', 'REVIEW_OUTDATED');
  }
  if (billing && billing.versionId !== version.id) throw AppError.conflict('Phiên bản hợp đồng đã thay đổi. Vui lòng kiểm tra lại số trang.', 'REVIEW_QUOTE_CHANGED');

  await assertNoOpenVerification(contractId);
  await releaseLostActiveReview(orgId, contractId);
  if (await ReviewModel.exists({ contractId, activeLock: true })) {
    throw AppError.conflict('Hợp đồng đang được rà soát. Vui lòng chờ yêu cầu hiện tại hoàn tất.', 'REVIEW_RUNNING');
  }
  if (!(await removeIdleReviewJob(review.id))) {
    throw AppError.conflict('Yêu cầu trước vẫn đang kết thúc. Vui lòng thử lại sau ít phút.', 'REVIEW_BUSY');
  }

  const { run, replayed } = await reserveUsage(
    {
      orgId,
      userId,
      contractId,
      kind: 'analysis',
      versionId: version.id,
      confirmedUnits: billing?.units,
      idempotencyKey,
      payload: { reviewId, retry: true },
    },
    new Date(),
    REVIEW_LEASE_MS,
  );
  if (replayed) throw AppError.conflict('Mã yêu cầu đã được dùng cho thao tác khác. Vui lòng tải lại và thử lại.');

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
      throw AppError.conflict('Hợp đồng đang được rà soát. Vui lòng chờ yêu cầu hiện tại hoàn tất.', 'REVIEW_RUNNING');
    }
    throw err;
  }
  if (!retried) {
    await releaseReviewCredit(orgId, run._id);
    throw AppError.conflict('Chỉ có thể thử lại yêu cầu rà soát đã thất bại hoặc bị hủy.', 'REVIEW_NOT_RETRYABLE');
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
  if (!review) throw AppError.notFound('Không tìm thấy yêu cầu rà soát.');
  return toReviewResponse(review);
}
