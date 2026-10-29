import mongoose from 'mongoose';
import { env } from '../../config/env';
import { AppError } from '../../errors/AppError';
import { ContractModel } from '../../models/contract.model';
import { ContractVersionModel } from '../../models/contractVersion.model';
import { ContractReviewPurchaseModel } from '../../models/contractReviewPurchase.model';
import { PaymentModel } from '../../models/payment.model';
import { UserModel } from '../../models/user.model';
import { requireReviewCost } from './reviewCost';
import { getSubscription, lockSubscriptionOrganization } from './subscription.service';
import { assertAccountReviewPolicy } from '../contract/personalReviewPolicy';

export async function contractReviewQuote(userId: string, orgId: string, contractId: string) {
  const user = await UserModel.findOne({ _id: userId, isActive: true }).populate('roleId');
  if (
    !user ||
    (user.roleId as unknown as { code?: string })?.code !== 'user' ||
    (user.orgId?.toString() ?? user.id) !== orgId
  )
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
  const pending = await PaymentModel.findOne({ orgId, isOpen: true }).select('orderCode');
  return {
    contractId,
    versionId: version.id,
    pageCount: cost.pageCount!,
    units: cost.units,
    unitPrice: env.PERSONAL_REVIEW_PRICE_PER_UNIT,
    amount: cost.units * env.PERSONAL_REVIEW_PRICE_PER_UNIT,
    currency: 'VND',
    availableUnits: subscription.analysis.available,
    canPurchase: !purchase && subscription.analysis.available < cost.units,
    purchaseStatus: purchase?.status ?? null,
    openOrderCode: pending?.orderCode ?? null,
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
        },
      ],
      { session },
    );
  });
}
