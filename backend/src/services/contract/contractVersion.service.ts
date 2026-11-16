import { createHash } from 'crypto';
import { Types } from 'mongoose';
import { AppError } from '../../errors/AppError';
import { ContractModel, CONTRACT_STATUSES } from '../../models/contract.model';
import { ContractVersionModel } from '../../models/contractVersion.model';
import { ReviewModel } from '../../models/review.model';

export const fileHashOf = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex');

export async function findVersionByFileHash(orgId: string, fileHash: string, contractId?: string) {
  const versions = await ContractVersionModel.find({
    fileHash,
    ...(contractId ? { contractId } : {}),
  })
    .select('contractId versionNumber createdAt')
    .sort({ createdAt: 1 })
    .lean();
  if (!versions.length) return null;
  const contract = await ContractModel.findOne({
    _id: { $in: versions.map((version) => version.contractId) },
    orgId,
  })
    .select('title')
    .lean();
  if (!contract) return null;
  const version = versions.find((item) => String(item.contractId) === contract._id.toString())!;
  return {
    contractId: contract._id.toString(),
    title: contract.title,
    versionNumber: version.versionNumber,
    uploadedAt: version.createdAt,
  };
}

export async function getCurrentVersion(contractId: string) {
  const version = await ContractVersionModel.findOne({ contractId }).sort({ versionNumber: -1 });
  if (!version) {
    throw AppError.notFound('Contract version not found');
  }
  return version;
}

export async function resolveVersion(contractId: string, versionId?: string, withText = false) {
  const query = versionId
    ? ContractVersionModel.findOne({ _id: versionId, contractId })
    : ContractVersionModel.findOne({ contractId }).sort({ versionNumber: -1 });
  if (withText) query.select('+extractedText');
  const version = await query;
  if (!version) {
    throw AppError.notFound(
      versionId ? 'Không tìm thấy phiên bản hợp đồng.' : 'Contract version not found',
    );
  }
  return version;
}

export async function findResultReviewId(versionId: unknown): Promise<Types.ObjectId | null> {
  const review = await ReviewModel.findOne({ versionId, status: 'completed' })
    .sort({ finishedAt: -1 })
    .select('_id')
    .lean();
  return review?._id ?? null;
}

export async function resolveResultReview(contractId: string, versionId?: string, reviewId?: string) {
  if (reviewId) {
    const review = await ReviewModel.findOne({ _id: reviewId, contractId }).select('versionId').lean();
    if (!review) throw AppError.notFound('Không tìm thấy lượt rà soát.');
    return { versionId: review.versionId, reviewId: review._id as Types.ObjectId | null };
  }
  const version = await resolveVersion(contractId, versionId);
  return { versionId: version._id, reviewId: await findResultReviewId(version._id) };
}

export async function getCurrentVersionWithText(contractId: string) {
  const version = await ContractVersionModel.findOne({ contractId })
    .sort({ versionNumber: -1 })
    .select('+extractedText');
  if (!version) {
    throw AppError.notFound('Contract version not found');
  }
  return version;
}

export type AnalysisStage = 'segmentation' | 'summary' | 'riskDetection';

const PROCESSING_STALE_MS = 10 * 60 * 1000;

function notRunning(stage: AnalysisStage) {
  return {
    $or: [
      { [`${stage}Status`]: { $ne: 'processing' } },
      { [`${stage}StartedAt`]: { $not: { $gte: new Date(Date.now() - PROCESSING_STALE_MS) } } },
    ],
  };
}

interface ClaimOptions {
  blockedBy?: AnalysisStage[];
  requireSegmented?: boolean;
  set?: Record<string, unknown>;
}

export async function claimStage(
  versionId: Types.ObjectId,
  stage: AnalysisStage,
  { blockedBy = [], requireSegmented = false, set = {} }: ClaimOptions = {},
) {
  return ContractVersionModel.findOneAndUpdate(
    {
      _id: versionId,
      ...(requireSegmented ? { segmentationStatus: 'completed' } : {}),
      $and: [stage, ...blockedBy].map(notRunning),
    },
    { $set: { [`${stage}Status`]: 'processing', [`${stage}StartedAt`]: new Date(), ...set } },
    { new: true },
  );
}

type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export function settledStatus(previous: ContractStatus): ContractStatus {
  return previous === 'processing' ? 'uploaded' : previous;
}

export async function setContractStatus(
  contractId: string,
  orgId: string,
  status: ContractStatus,
) {
  await ContractModel.updateOne({ _id: contractId, orgId }, { $set: { status } });
}
