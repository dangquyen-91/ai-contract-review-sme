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
import { ExpertReviewModel } from '../../models/expertReview.model';
import { ExpertActionModel } from '../../models/expertAction.model';
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
import {
  fileHashOf,
  findVersionByFileHash,
  getCurrentVersion,
  resolveVersion,
} from './contractVersion.service';
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

  const fileHash = file ? fileHashOf(file.buffer) : undefined;
  if (fileHash && !input.allowDuplicate) {
    const duplicate = await findVersionByFileHash(orgId, fileHash);
    if (duplicate) {
      throw AppError.conflict(
        `Tệp này giống hệt hợp đồng "${duplicate.title}" (phiên bản ${duplicate.versionNumber}) đã tải lên trước đó.`,
        'DUPLICATE_CONTRACT',
        duplicate,
      );
    }
  }

  const stored = file ? await uploadContractFile(file.buffer, orgId, file.name) : undefined;

  let contractId: Types.ObjectId | undefined;
  let versionId: Types.ObjectId | undefined;
  let job: Awaited<ReturnType<typeof enqueueExtraction>> | undefined;
  try {
    const contract = await ContractModel.create({
      ownerType: orgId === uploadedBy ? 'personal' : 'organization',
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
      fileHash,
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

interface AddContractVersionParams {
  orgId: string;
  uploadedBy: string;
  contractId: string;
  note?: string;
  file: { name: string; mimeType: string; buffer: Buffer };
  waitForExtraction: boolean;
}

const reviewRunning = () =>
  AppError.conflict(
    'Hợp đồng đang được rà soát. Vui lòng chờ hoàn tất trước khi tải phiên bản mới.',
    'REVIEW_RUNNING',
  );

export async function addContractVersion({
  orgId,
  uploadedBy,
  contractId,
  note,
  file,
  waitForExtraction: shouldWait,
}: AddContractVersionParams) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId }).select('status');
  if (!contract) throw AppError.notFound('Không tìm thấy hợp đồng.');
  if (contract.status === 'unsupported') {
    throw AppError.conflict(
      'Hợp đồng không thuộc loại được hỗ trợ nên không thể thêm phiên bản.',
      'CONTRACT_UNSUPPORTED',
    );
  }
  if (await ReviewModel.exists({ contractId, activeLock: true })) throw reviewRunning();

  const fileHash = fileHashOf(file.buffer);
  const duplicate = await findVersionByFileHash(orgId, fileHash, contractId);
  if (duplicate) {
    throw AppError.conflict(
      `Tệp này giống hệt phiên bản ${duplicate.versionNumber} của hợp đồng.`,
      'DUPLICATE_VERSION',
      duplicate,
    );
  }

  const previousStatus = contract.status;
  const stored = await uploadContractFile(file.buffer, orgId, file.name);
  let versionId: Types.ObjectId | undefined;
  let job: Awaited<ReturnType<typeof enqueueExtraction>> | undefined;
  try {
    versionId = await mongoose.connection.transaction(async (session) => {
      const locked = await ContractModel.findOneAndUpdate(
        { _id: contractId, orgId },
        { $inc: { __v: 1 }, $set: { status: 'uploaded' } },
        { session },
      );
      if (!locked) throw AppError.notFound('Không tìm thấy hợp đồng.');
      if (await ReviewModel.exists({ contractId, activeLock: true }).session(session)) {
        throw reviewRunning();
      }
      const latest = await ContractVersionModel.findOne({ contractId })
        .sort({ versionNumber: -1 })
        .select('versionNumber')
        .session(session);
      const [created] = await ContractVersionModel.create(
        [
          {
            contractId,
            versionNumber: (latest?.versionNumber ?? 0) + 1,
            createdBy: uploadedBy,
            note,
            fileKey: stored.key,
            fileResourceType: stored.resourceType,
            fileDeliveryType: stored.deliveryType,
            fileFormat: stored.format,
            fileName: file.name,
            mimeType: file.mimeType,
            fileHash,
            extractionStatus: 'processing',
            extractionStartedAt: new Date(),
          },
        ],
        { session },
      );
      return created._id;
    });
    job = await enqueueExtraction(versionId.toString());
  } catch (err) {
    if (versionId) {
      await ContractVersionModel.deleteOne({ _id: versionId });
      await ContractModel.updateOne({ _id: contractId, orgId }, { $set: { status: previousStatus } });
    }
    await deleteContractFile(stored).catch((cleanupErr) =>
      logger.warn('Failed to remove uploaded contract file after a failed version upload', {
        fileKey: stored.key,
        error: cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr),
      }),
    );
    throw err;
  }

  if (shouldWait) await waitForExtraction(job);
  return getContractById(orgId, contractId);
}

export async function listContractVersions(orgId: string, contractId: string) {
  if (!(await ContractModel.exists({ _id: contractId, orgId }))) {
    throw AppError.notFound('Không tìm thấy hợp đồng.');
  }
  const [versions, reviews] = await Promise.all([
    ContractVersionModel.find({ contractId })
      .sort({ versionNumber: -1 })
      .select('versionNumber fileName mimeType note createdBy createdAt extractionStatus extractionQuality')
      .populate<{ createdBy: { _id: Types.ObjectId; name: string } | null }>('createdBy', 'name')
      .lean(),
    ReviewModel.find({ contractId, orgId })
      .sort({ createdAt: -1 })
      .select('versionId status finishedAt result.overallRiskLevel result.findingCounts')
      .lean(),
  ]);
  const latestReviewByVersion = new Map<string, (typeof reviews)[number]>();
  for (const review of reviews) {
    const key = String(review.versionId);
    const chosen = latestReviewByVersion.get(key);
    if (!chosen || (chosen.status !== 'completed' && review.status === 'completed')) {
      latestReviewByVersion.set(key, review);
    }
  }
  const verifications = await ExpertReviewModel.find({
    reviewId: { $in: [...latestReviewByVersion.values()].map((review) => review._id) },
  })
    .select('reviewId status')
    .lean();
  const verificationByReview = new Map(
    verifications.map((verification) => [String(verification.reviewId), verification.status]),
  );

  return versions.map((version, index) => {
    const review = latestReviewByVersion.get(String(version._id));
    return {
      id: String(version._id),
      versionNumber: version.versionNumber,
      isCurrent: index === 0,
      fileName: version.fileName ?? null,
      mimeType: version.mimeType ?? null,
      note: version.note ?? null,
      uploadedBy: version.createdBy
        ? { id: String(version.createdBy._id), name: version.createdBy.name }
        : null,
      uploadedAt: version.createdAt,
      extractionStatus: version.extractionStatus,
      pageCount: version.extractionQuality?.pageCount ?? null,
      latestReview: review
        ? {
            id: String(review._id),
            status: review.status,
            finishedAt: review.finishedAt ?? null,
            overallRiskLevel: review.result?.overallRiskLevel ?? null,
            findingCounts: review.result?.findingCounts ?? null,
            verificationStatus: verificationByReview.get(String(review._id)) ?? null,
          }
        : null,
    };
  });
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
    {
      $lookup: {
        from: ReviewModel.collection.name,
        let: { contractId: '$_id', versionId: '$currentVersion._id' },
        pipeline: [
          { $match: { orgId: new Types.ObjectId(orgId), $expr: { $and: [{ $eq: ['$contractId', '$$contractId'] }, { $eq: ['$versionId', '$$versionId'] }] } } },
          { $sort: { createdAt: -1, _id: -1 } },
          { $limit: 1 },
          { $project: { _id: 1 } },
        ],
        as: '_latestReview',
      },
    },
    {
      $lookup: {
        from: ExpertReviewModel.collection.name,
        let: { contractId: '$_id' },
        pipeline: [
          { $match: { orgId: new Types.ObjectId(orgId), $expr: { $eq: ['$contractId', '$$contractId'] } } },
          { $sort: { requestedAt: -1, _id: -1 } },
          { $limit: 1 },
          { $project: { _id: 1, reviewId: 1, status: 1, attempt: 1, requestedAt: 1, assignedAt: 1, completedAt: 1 } },
        ],
        as: '_verification',
      },
    },
    { $set: { latestReviewId: { $ifNull: [{ $arrayElemAt: ['$_latestReview._id', 0] }, null] }, expertVerification: { $ifNull: [{ $arrayElemAt: ['$_verification', 0] }, null] } } },
    { $project: { _latestReview: 0, _verification: 0 } },
  ];

  if (query.verificationStatus) {
    pipeline.push({ $match: query.verificationStatus === 'not_sent'
      ? { expertVerification: null }
      : { 'expertVerification.status': query.verificationStatus } });
  }

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
    const expertReviewIds = await ExpertReviewModel.find({ contractId: id }).distinct('_id').session(session);
    await ExpertActionModel.deleteMany({ expertReviewId: { $in: expertReviewIds } }).session(session);
    await ExpertReviewModel.deleteMany({ contractId: id }).session(session);
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
  versionId?: string,
) {
  const contract = await ContractModel.findOne({ _id: id, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  const version = await resolveVersion(id, versionId, true);
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

export async function getRedactedContractDocx(orgId: string, id: string, versionId?: string) {
  const contract = await ContractModel.findOne({ _id: id, orgId });
  if (!contract) throw AppError.notFound('Contract not found');
  const version = await resolveVersion(id, versionId, true);
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

export async function getContractFileLink(orgId: string, id: string, versionId?: string) {
  const contract = await ContractModel.findOne({ _id: id, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  const version = await resolveVersion(id, versionId);
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
