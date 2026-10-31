import mongoose, { PipelineStage, Types } from 'mongoose';
import { AppError } from '../../errors/AppError';
import { PaginationParams } from '../../utils/pagination';
import { ContractModel } from '../../models/contract.model';
import { ContractVersionModel } from '../../models/contractVersion.model';
import { ClauseModel } from '../../models/clause.model';
import { RiskFindingModel } from '../../models/riskFinding.model';
import { RiskCitationModel } from '../../models/riskCitation.model';
import { ChatMessageModel } from '../../models/chatMessage.model';
import { ReviewModel } from '../../models/review.model';
import { CreateContractInput, ListContractsQuery } from '../../validations/contract.validation';
import { logger } from '../../config/logger';
import {
  createFileDownloadLink,
  downloadContractFile,
  deleteContractFile,
  storedFileOf,
  uploadContractFile,
} from './storage.service';
import { enqueueExtraction, waitForExtraction } from './extractionWorker.service';
import { getCurrentVersion, getCurrentVersionWithText } from './contractVersion.service';
import { resolveContractProfile, validateContractContext } from './contractProfile.service';
import { redactionPolicyFor } from './redactionPolicy.service';
import { createRedactor, SensitiveDataType } from '../ai/redaction.service';
import { DOCX_MIME, redactDocx } from './docxRedaction.service';
import { reviewCost } from '../billing/reviewCost';
import { ContractReviewPurchaseModel } from '../../models/contractReviewPurchase.model';
import { PaymentModel } from '../../models/payment.model';
import { lockSubscriptionOrganization } from '../billing/subscription.service';
import { contractDisplayNames } from './contractDisplayNames';

interface CreateContractParams {
  orgId: string;
  uploadedBy: string;
  input: CreateContractInput;
  file?: {
    name: string;
    mimeType: string;
    buffer: Buffer;
  };
  waitForExtraction: boolean;
}

function titleFromFileName(fileName?: string) {
  const base = fileName?.replace(/\.[^.]+$/, '').trim();
  return base && base.length >= 2 ? base.slice(0, 300) : 'Hợp đồng chưa đặt tên';
}

export async function createContract({
  orgId,
  uploadedBy,
  input,
  file,
  waitForExtraction: shouldWait,
}: CreateContractParams) {
  const profile = input.type ? await resolveContractProfile(input.type) : undefined;
  if (profile) await validateContractContext(profile, input);
  else if (input.ourParty) throw AppError.badRequest('ourParty requires a contract type');

  const stored = file ? await uploadContractFile(file.buffer, orgId, file.name) : undefined;

  let contractId: Types.ObjectId | undefined;
  let versionId: Types.ObjectId | undefined;
  let job: Awaited<ReturnType<typeof enqueueExtraction>> | undefined;
  try {
    const contract = await ContractModel.create({
      orgId,
      uploadedBy,
      title: input.title ?? titleFromFileName(file?.name),
      type: profile?.code,
      ourParty: input.ourParty,
      industry: input.industry,
      classification: profile
        ? {
            status: 'completed',
            outcome: 'supported',
            type: profile.code,
            ourParty: input.ourParty,
            source: 'user',
            confirmedAt: new Date(),
          }
        : { status: 'pending' },
    });
    contractId = contract._id;

    const currentVersion = await ContractVersionModel.create({
      contractId: contract._id,
      versionNumber: 1,
      createdBy: uploadedBy,
      fileKey: stored?.key,
      fileResourceType: stored?.resourceType,
      fileDeliveryType: stored?.deliveryType,
      fileFormat: stored?.format,
      fileName: file?.name,
      mimeType: file?.mimeType,
      extractionStatus: stored ? 'processing' : 'pending',
      extractionStartedAt: stored ? new Date() : undefined,
    });
    versionId = currentVersion._id;

    if (stored) job = await enqueueExtraction(currentVersion.id);
  } catch (err) {
    if (versionId) await ContractVersionModel.deleteOne({ _id: versionId });
    if (contractId) await ContractModel.deleteOne({ _id: contractId });
    if (stored) {
      await deleteContractFile(stored).catch((cleanupErr) =>
        logger.warn('Failed to remove uploaded contract file after a failed create', {
          fileKey: stored.key,
          error: cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr),
        }),
      );
    }
    throw err;
  }

  if (job && shouldWait) await waitForExtraction(job);
  return getContractById(orgId, contractId.toString());
}

export async function listContracts(
  orgId: string,
  query: ListContractsQuery,
  pagination: PaginationParams,
) {
  const match: Record<string, unknown> = { orgId: new Types.ObjectId(orgId) };
  if (query.type) match.type = (await resolveContractProfile(query.type)).code;
  if (query.industry) match.industry = query.industry;
  if (query.status) match.status = query.status;
  if (query.search) match.$text = { $search: query.search };

  const pipeline: PipelineStage[] = [
    { $match: match },
    {
      $lookup: {
        from: ContractVersionModel.collection.name,
        let: { contractId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$contractId', '$$contractId'] } } },
          { $sort: { versionNumber: -1 } },
          { $limit: 1 },
          { $project: { extractedText: 0 } },
        ],
        as: 'currentVersion',
      },
    },
    { $unwind: { path: '$currentVersion', preserveNullAndEmptyArrays: true } },
  ];

  if (query.riskLevel) {
    pipeline.push({ $match: { 'currentVersion.overallRiskLevel': query.riskLevel } });
  }

  const sortByRisk = pagination.sortBy === 'overallRiskLevel';
  const sortStages: PipelineStage[] = sortByRisk
    ? [
        {
          $addFields: {
            _riskRank: {
              $switch: {
                branches: [
                  { case: { $eq: ['$currentVersion.overallRiskLevel', 'high'] }, then: 3 },
                  { case: { $eq: ['$currentVersion.overallRiskLevel', 'medium'] }, then: 2 },
                  { case: { $eq: ['$currentVersion.overallRiskLevel', 'low'] }, then: 1 },
                ],
                default: 0,
              },
            },
          },
        },
        { $sort: { _riskRank: pagination.sortOrder, _id: pagination.sortOrder } },
        { $project: { _riskRank: 0 } },
      ]
    : [{ $sort: { [pagination.sortBy]: pagination.sortOrder, _id: pagination.sortOrder } }];

  const [items, totalResult] = await Promise.all([
    ContractModel.aggregate([
      ...pipeline,
      ...sortStages,
      { $skip: pagination.skip },
      { $limit: pagination.limit },
    ]),
    ContractModel.aggregate([...pipeline, { $count: 'total' }]),
  ]);

  return { items: items.map((item) => contractDisplayNames(item)), total: totalResult[0]?.total ?? 0 };
}

export async function getContractById(orgId: string, id: string) {
  const contract = await ContractModel.findOne({ _id: id, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  const currentVersion = await getCurrentVersion(id);
  const purchase = await ContractReviewPurchaseModel.findOne({
    orgId,
    contractId: id,
    versionId: currentVersion.id,
  }).select('status');
  return contractDisplayNames({
    ...contract.toObject(),
    currentVersion: currentVersion.toObject(),
    reviewBilling: {
      ...reviewCost(currentVersion),
      versionId: currentVersion.id,
      purchaseStatus: purchase?.status ?? null,
    },
  });
}

async function assertContractDeletable(
  orgId: string,
  contractId: string,
  session: import('mongoose').ClientSession,
) {
  if (
    (await PaymentModel.exists({ orgId, contractId, isOpen: true }).session(session)) ||
    (await ContractReviewPurchaseModel.exists({
      orgId,
      contractId,
      status: { $in: ['available', 'reserved'] },
    }).session(session))
  )
    throw AppError.conflict(
      'Hợp đồng có đơn thanh toán đang chờ hoặc quyền rà soát đã mua chưa sử dụng. Hãy hủy đơn đang chờ hoặc hoàn tất rà soát trước khi xóa.',
    );
}

export async function deleteContract(orgId: string, id: string) {
  const versions = await mongoose.connection.transaction(async (session) => {
    await lockSubscriptionOrganization(orgId, session);
    const contract = await ContractModel.findOne({ _id: id, orgId }).session(session);
    if (!contract) {
      throw AppError.notFound('Contract not found');
    }

    await assertContractDeletable(orgId, id, session);
    const versions = await ContractVersionModel.find({ contractId: id }).session(session);
    const versionIds = versions.map((v) => v._id);

    const findingIds = await RiskFindingModel.find({
      contractVersionId: { $in: versionIds },
    })
      .distinct('_id')
      .session(session);
    await RiskCitationModel.deleteMany({ riskFindingId: { $in: findingIds } }).session(session);
    await RiskFindingModel.deleteMany({ contractVersionId: { $in: versionIds } }).session(session);
    await ReviewModel.deleteMany({ contractId: id }).session(session);
    await ClauseModel.deleteMany({ contractVersionId: { $in: versionIds } }).session(session);
    await ChatMessageModel.deleteMany({ contractVersionId: { $in: versionIds } }).session(session);
    await ContractVersionModel.deleteMany({ contractId: id }).session(session);
    await ContractModel.deleteOne({ _id: id, orgId }).session(session);

    return versions;
  });

  await Promise.all(
    versions.map(async (version) => {
      const file = storedFileOf(version);
      if (!file) return;
      await deleteContractFile(file).catch((cleanupErr) =>
        logger.warn('Failed to remove contract file after deleting the contract', {
          fileKey: file.key,
          error: cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr),
        }),
      );
    }),
  );
}

export async function getContractText(
  orgId: string,
  id: string,
  redacted = false,
  redactionMode: 'token' | 'partial' = 'token',
) {
  const contract = await ContractModel.findOne({ _id: id, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  const version = await getCurrentVersionWithText(id);
  const text = version.extractedText ?? '';
  let shownText = text;
  let redactionSpans: { type: SensitiveDataType; start: number; end: number }[] = [];
  if (redacted && text) {
    const redactor = createRedactor(text, await redactionPolicyFor(contract.type));
    if (redactionMode === 'partial') {
      const preview = redactor.maskForDisplay(text);
      shownText = preview.text;
      redactionSpans = preview.spans;
    } else shownText = redactor.mask(text);
  }
  return {
    text: shownText,
    redacted,
    ...(redacted
      ? { redactionMode, ...(redactionMode === 'partial' ? { redactionSpans } : {}) }
      : {}),
    extractionStatus: version.extractionStatus,
    fileName: version.fileName,
    mimeType: version.mimeType,
  };
}

export async function getRedactedContractDocx(orgId: string, id: string) {
  const contract = await ContractModel.findOne({ _id: id, orgId });
  if (!contract) throw AppError.notFound('Contract not found');
  const version = await getCurrentVersionWithText(id);
  if (version.mimeType !== DOCX_MIME)
    throw AppError.badRequest('Redacted file preview is supported only for DOCX');
  const file = storedFileOf(version);
  if (!file) throw AppError.notFound('This contract has no uploaded file');
  return {
    buffer: await redactDocx(
      await downloadContractFile(file),
      version.extractedText ?? '',
      await redactionPolicyFor(contract.type),
    ),
    fileName: `${(version.fileName ?? 'contract.docx').replace(/\.docx$/i, '')}-redacted.docx`,
  };
}

export async function getContractFileLink(orgId: string, id: string) {
  const contract = await ContractModel.findOne({ _id: id, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  const version = await getCurrentVersion(id);
  const file = storedFileOf(version);
  if (!file) {
    throw AppError.notFound('This contract has no uploaded file');
  }

  return {
    ...createFileDownloadLink(file),
    fileName: version.fileName,
    mimeType: version.mimeType,
  };
}
