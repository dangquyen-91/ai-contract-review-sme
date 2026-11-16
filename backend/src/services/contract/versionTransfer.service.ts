import mongoose, { ClientSession, Types } from 'mongoose';
import { logger } from '../../config/logger';
import { AppError } from '../../errors/AppError';
import { ChatMessageModel } from '../../models/chatMessage.model';
import { ContractModel } from '../../models/contract.model';
import { ContractDraftModel } from '../../models/contractDraft.model';
import { ContractReviewPurchaseModel } from '../../models/contractReviewPurchase.model';
import { ContractVersionModel } from '../../models/contractVersion.model';
import { PaymentModel } from '../../models/payment.model';
import { ReviewModel } from '../../models/review.model';
import { UsageRunModel } from '../../models/subscription.model';
import { enqueueClassification } from './classificationWorker.service';
import { getContractById, titleFromFileName } from './contract.service';

const reviewRunning = () =>
  AppError.conflict('Hợp đồng đang được rà soát. Vui lòng chờ hoàn tất rồi thử lại.', 'REVIEW_RUNNING');

async function assertVersionMovable(versionId: Types.ObjectId, session: ClientSession) {
  const [review, purchase, payment, chat, usage] = await Promise.all([
    ReviewModel.exists({ versionId }).session(session),
    ContractReviewPurchaseModel.exists({ versionId }).session(session),
    PaymentModel.exists({ versionId }).session(session),
    ChatMessageModel.exists({ contractVersionId: versionId }).session(session),
    UsageRunModel.exists({ versionId }).session(session),
  ]);
  if (review || purchase || payment || chat || usage) {
    throw AppError.conflict(
      'Phiên bản đã được rà soát, thanh toán hoặc hỏi đáp nên không thể chuyển sang hợp đồng khác.',
      'VERSION_IN_USE',
    );
  }
}

async function statusAfterVersionChange(contractId: Types.ObjectId, session: ClientSession) {
  const latest = await ContractVersionModel.findOne({ contractId })
    .sort({ versionNumber: -1 })
    .select('_id')
    .session(session);
  if (!latest) return 'uploaded';
  const completed = await ReviewModel.exists({ versionId: latest._id, status: 'completed' }).session(session);
  return completed ? 'reviewed' : 'uploaded';
}

export async function attachAsVersion({
  orgId,
  targetContractId,
  sourceContractId,
  note,
}: {
  orgId: string;
  targetContractId: string;
  sourceContractId: string;
  note?: string;
}) {
  if (targetContractId === sourceContractId) {
    throw AppError.badRequest('Không thể gộp một hợp đồng vào chính nó.');
  }

  await mongoose.connection.transaction(async (session) => {
    const target = await ContractModel.findOneAndUpdate(
      { _id: targetContractId, orgId },
      { $inc: { __v: 1 } },
      { session, new: true },
    );
    if (!target) throw AppError.notFound('Không tìm thấy hợp đồng.');
    if (target.status === 'unsupported' || target.status === 'archived') {
      throw AppError.conflict('Hợp đồng này không nhận thêm phiên bản.', 'CONTRACT_UNSUPPORTED');
    }
    if (await ReviewModel.exists({ contractId: target._id, activeLock: true }).session(session)) {
      throw reviewRunning();
    }

    const source = await ContractModel.findOne({ _id: sourceContractId, orgId }).session(session);
    if (!source) throw AppError.notFound('Không tìm thấy hợp đồng vừa tải lên.');
    const sourceVersions = await ContractVersionModel.find({ contractId: source._id }).session(session);
    if (sourceVersions.length !== 1) {
      throw AppError.conflict('Chỉ gộp được hợp đồng có đúng một phiên bản.', 'VERSION_IN_USE');
    }
    const [version] = sourceVersions;
    await assertVersionMovable(version._id, session);

    if (version.fileHash) {
      const duplicate = await ContractVersionModel.findOne({ contractId: target._id, fileHash: version.fileHash })
        .select('versionNumber')
        .session(session);
      if (duplicate) {
        throw AppError.conflict(
          `Tệp này giống hệt phiên bản ${duplicate.versionNumber} của hợp đồng.`,
          'DUPLICATE_VERSION',
          { contractId: String(target._id), title: target.title, versionNumber: duplicate.versionNumber },
        );
      }
    }

    const latest = await ContractVersionModel.findOne({ contractId: target._id })
      .sort({ versionNumber: -1 })
      .select('versionNumber')
      .session(session);
    version.set({
      contractId: target._id,
      versionNumber: (latest?.versionNumber ?? 0) + 1,
      ...(note ? { note } : {}),
    });
    await version.save({ session });
    await ContractDraftModel.updateMany({ contractId: source._id }, { $set: { contractId: target._id } }).session(session);
    await ContractModel.deleteOne({ _id: source._id }).session(session);
    await ContractModel.updateOne({ _id: target._id }, { $set: { status: 'uploaded' } }).session(session);
  });

  return getContractById(orgId, targetContractId);
}

export async function detachVersion({
  orgId,
  contractId,
  versionId,
}: {
  orgId: string;
  contractId: string;
  versionId: string;
}) {
  const result = await mongoose.connection.transaction(async (session) => {
    const contract = await ContractModel.findOneAndUpdate(
      { _id: contractId, orgId },
      { $inc: { __v: 1 } },
      { session, new: true },
    );
    if (!contract) throw AppError.notFound('Không tìm thấy hợp đồng.');
    if (await ReviewModel.exists({ contractId: contract._id, activeLock: true }).session(session)) {
      throw reviewRunning();
    }

    const versions = await ContractVersionModel.find({ contractId: contract._id })
      .sort({ versionNumber: -1 })
      .session(session);
    const version = versions.find((item) => String(item._id) === versionId);
    if (!version) throw AppError.notFound('Không tìm thấy phiên bản.');
    if (versions.length < 2) {
      throw AppError.conflict('Hợp đồng chỉ có một phiên bản nên không cần tách.', 'VERSION_IN_USE');
    }
    if (versions[0]._id.toString() !== versionId) {
      throw AppError.conflict('Chỉ tách được phiên bản mới nhất.', 'VERSION_IN_USE');
    }
    await assertVersionMovable(version._id, session);

    const [created] = await ContractModel.create(
      [
        {
          ownerType: contract.ownerType,
          orgId: contract.orgId,
          uploadedBy: version.createdBy,
          title: titleFromFileName(version.fileName ?? undefined),
          classification: { status: 'pending' },
        },
      ],
      { session },
    );
    version.set({ contractId: created._id, versionNumber: 1 });
    await version.save({ session });
    await ContractModel.updateOne(
      { _id: contract._id },
      { $set: { status: await statusAfterVersionChange(contract._id, session) } },
    ).session(session);
    return { newContractId: String(created._id), extracted: version.extractionStatus === 'completed' };
  });

  if (result.extracted) {
    await enqueueClassification(result.newContractId).catch((err) =>
      logger.warn('Failed to queue classification for a detached version', {
        contractId: result.newContractId,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }
  return getContractById(orgId, result.newContractId);
}
