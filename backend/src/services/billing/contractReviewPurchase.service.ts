import mongoose, { ClientSession } from 'mongoose';
import { env } from '../../config/env';
import { AppError } from '../../errors/AppError';
import { ContractModel } from '../../models/contract.model';
import { ContractVersionModel } from '../../models/contractVersion.model';
import { ContractReviewPurchaseModel } from '../../models/contractReviewPurchase.model';
import { PaymentModel, isReplaceableOrder } from '../../models/payment.model';
import { UserModel } from '../../models/user.model';
import { requireReviewCost } from './reviewCost';
import { getSubscription, lockSubscriptionOrganization } from './subscription.service';
import { assertAccountReviewPolicy } from '../contract/personalReviewPolicy';

// Purchases of this contract that still have included chat questions left.
const withChatLeft = {
  $expr: { $lt: [{ $add: ['$chatUsed', '$chatReserved'] }, '$chatAllowance'] },
};

/** The paid review purchase whose included chat the next question should use. */
export function findChatAllowance(
  orgId: string,
  userId: string,
  contractId: string,
  session: ClientSession | null = null,
) {
  return ContractReviewPurchaseModel.findOne({ orgId, userId, contractId, ...withChatLeft })
    .sort({ createdAt: 1 })
    .session(session);
}

/** Included chat questions across every paid review of the contract. */
export async function contractChatAllowance(orgId: string, userId: string, contractId: string) {
  const rows = await ContractReviewPurchaseModel.find({ orgId, userId, contractId })
    .select('chatAllowance chatUsed chatReserved')
    .lean();
  const total = (field: 'chatAllowance' | 'chatUsed' | 'chatReserved') =>
    rows.reduce((sum, row) => sum + (row[field] ?? 0), 0);
  const allowance = total('chatAllowance');
  const used = total('chatUsed');
  const reserved = total('chatReserved');
  return { allowance, used, reserved, available: Math.max(0, allowance - used - reserved) };
}

/**
 * An unused paid review bought for an earlier version of the contract. It moves to
 * the latest version instead of being stranded when a new file is uploaded.
 */
export function findCarriedPurchase(
  orgId: string,
  userId: string,
  contractId: string,
  currentVersionId: string,
  session: ClientSession | null = null,
) {
  return ContractReviewPurchaseModel.findOne({
    orgId,
    userId,
    contractId,
    status: 'available',
    versionId: { $ne: currentVersionId },
  })
    .sort({ createdAt: -1 })
    .session(session);
}

export async function contractReviewQuote(userId: string, orgId: string, contractId: string) {
  const user = await UserModel.findOne({ _id: userId, isActive: true, platformRole: null });
  if (!user || user.id !== orgId)
    throw AppError.forbidden('Thanh toán từng hợp đồng chỉ dành cho tài khoản cá nhân.');
  const contract = await ContractModel.findOne({ _id: contractId, orgId, uploadedBy: userId });
  if (!contract) throw AppError.notFound('Không tìm thấy hợp đồng.');
  if (!contract.type && contract.classification?.outcome !== 'supported')
    throw AppError.conflict('Hãy xác nhận loại hợp đồng trước khi thanh toán.');
  const type = contract.type ?? contract.classification?.type;
  if (!type) throw AppError.conflict('Chưa xác định được loại hợp đồng.');
  assertAccountReviewPolicy(true, type, contract.ourParty ?? contract.classification?.ourParty);
  const version = await ContractVersionModel.findOne({ contractId }).sort({ versionNumber: -1 });
  if (!version) throw AppError.notFound('Không tìm thấy phiên bản hợp đồng.');
  const cost = requireReviewCost(version);
  const subscription = await getSubscription(userId, orgId);
  const purchase = await ContractReviewPurchaseModel.findOne({ orgId, versionId: version.id });
  // Unused paid units (for this version or carried from an earlier one) count first,
  // then the plan's remaining units; only the shortfall is paid.
  const paidSource = purchase
    ? purchase.status === 'available'
      ? purchase
      : null
    : await findCarriedPurchase(orgId, userId, contractId, version.id);
  const paidUnits = paidSource?.units ?? 0;
  const planUnits = Math.min(subscription.analysis.available, Math.max(0, cost.units - paidUnits));
  const shortfallUnits = Math.max(0, cost.units - paidUnits - planUnits);
  const spent = purchase && purchase.status !== 'available';
  const pending = await PaymentModel.findOne({ orgId, isOpen: true }).select(
    'orderCode paidAt paymentLinkId providerError',
  );
  // An abandoned unpaid order is replaced by a new checkout instead of blocking it.
  const blocking = pending && !isReplaceableOrder(pending) ? pending : null;
  return {
    contractId,
    versionId: version.id,
    pageCount: cost.pageCount!,
    units: cost.units,
    paidUnits,
    planUnits,
    shortfallUnits,
    carryPurchaseId: paidSource?.id ?? null,
    unitPrice: env.PERSONAL_REVIEW_PRICE_PER_UNIT,
    amount: shortfallUnits * env.PERSONAL_REVIEW_PRICE_PER_UNIT,
    currency: 'VND',
    availableUnits: subscription.analysis.available,
    canPurchase: !spent && shortfallUnits > 0,
    purchaseStatus: spent ? purchase!.status : paidSource && shortfallUnits === 0 ? 'available' : null,
    openOrderCode: blocking?.orderCode ?? null,
    replacesOrderCode: pending && !blocking ? pending.orderCode : null,
    // Chat included with a new purchase, and what earlier purchases have left.
    includedChat: env.PERSONAL_REVIEW_CHAT_ALLOWANCE,
    contractChat: await contractChatAllowance(orgId, userId, contractId),
  };
}

export async function activateContractReviewPurchase(order: InstanceType<typeof PaymentModel>) {
  if (
    !order.contractId ||
    !order.versionId ||
    !order.pageCount ||
    !order.reviewUnits ||
    !order.paidAt
  )
    throw AppError.conflict('Thông tin thanh toán hợp đồng chưa đầy đủ.');
  return mongoose.connection.transaction(async (session) => {
    await lockSubscriptionOrganization(order.orgId.toString(), session);
    const version = await ContractVersionModel.findOne({
      _id: order.versionId,
      contractId: order.contractId,
    }).session(session);
    const contract = await ContractModel.exists({
      _id: order.contractId,
      orgId: order.orgId,
      uploadedBy: order.createdBy,
    }).session(session);
    if (!version || !contract)
      throw AppError.conflict('Không tìm thấy phiên bản hợp đồng đã thanh toán.');
    if (order.carryPurchaseId) {
      // Top-up for a longer new version: move the earlier paid review onto it.
      const carried = await ContractReviewPurchaseModel.findOne({
        _id: order.carryPurchaseId,
        orgId: order.orgId,
      }).session(session);
      if (!carried) throw AppError.conflict('Không tìm thấy lượt rà soát đã thanh toán trước.');
      if (carried.extraOrderCodes?.includes(order.orderCode)) return;
      if (carried.status !== 'available')
        throw AppError.conflict('Lượt rà soát đã thanh toán trước không còn khả dụng.');
      await ContractReviewPurchaseModel.updateOne(
        { _id: carried._id, status: 'available' },
        {
          $set: { versionId: order.versionId, pageCount: order.pageCount, units: order.reviewUnits },
          $inc: { amount: order.amount },
          $push: { extraOrderCodes: order.orderCode },
        },
        { session },
      );
      return;
    }
    const existing = await ContractReviewPurchaseModel.findOne({
      orgId: order.orgId,
      versionId: order.versionId,
    }).session(session);
    if (existing) {
      if (existing.orderCode !== order.orderCode)
        throw AppError.conflict('Phiên bản hợp đồng đã được thanh toán bằng đơn khác.');
      return;
    }
    await ContractReviewPurchaseModel.create(
      [
        {
          orgId: order.orgId,
          userId: order.createdBy,
          contractId: order.contractId,
          versionId: order.versionId,
          orderCode: order.orderCode,
          pageCount: order.pageCount,
          units: order.reviewUnits,
          amount: order.amount,
          chatAllowance: env.PERSONAL_REVIEW_CHAT_ALLOWANCE,
        },
      ],
      { session },
    );
  });
}
