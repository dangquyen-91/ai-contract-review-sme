import { Types } from 'mongoose';
import { AppError } from '../errors/AppError';
import { ContractModel, CONTRACT_STATUSES } from '../models/contract.model';
import { ContractVersionModel } from '../models/contractVersion.model';

export async function getCurrentVersion(contractId: string) {
  const version = await ContractVersionModel.findOne({ contractId }).sort({ versionNumber: -1 });
  if (!version) {
    throw AppError.notFound('Contract version not found');
  }
  return version;
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
