import { randomInt } from 'crypto';
import mongoose, { HydratedDocument } from 'mongoose';
import type { PaymentLink, Webhook } from '@payos/node';
import { env } from '../../config/env';
import { AppError } from '../../errors/AppError';
import { ContractModel } from '../../models/contract.model';
import {
  PaymentAction,
  PaymentModel,
  Payment as PaymentData,
  isReplaceableOrder,
} from '../../models/payment.model';
import { PlanCode, PlanModel, TopUpPackCode } from '../../models/subscription.model';
import {
  activatePaidSubscription,
  lockSubscriptionOrganization,
  quotePlanCheckout,
  requireSubscriptionAccess,
} from './subscription.service';
import * as provider from './payos.service';
import {
  contractReviewQuote,
  activateContractReviewPurchase,
} from './contractReviewPurchase.service';
import { activateTopUp, quoteTopUp } from './topUp.service';

type Payment = HydratedDocument<PaymentData>;
type Purchase =
  | { planCode: PlanCode; action: PaymentAction }
  | {
      purpose: 'contract_review';
      action: 'purchase';
      contractId: string;
      versionId: string;
      expectedAmount: number;
    }
  | {
      purpose: 'top_up';
      action: 'purchase';
      packCode: TopUpPackCode;
      expectedAmount: number;
    };
const isTopUp = (input: Purchase): input is Extract<Purchase, { purpose: 'top_up' }> =>
  'purpose' in input && input.purpose === 'top_up';
const isReviewPurchase = (
  input: Purchase,
): input is Extract<Purchase, { purpose: 'contract_review' }> =>
  'purpose' in input && input.purpose === 'contract_review';
const reference = (orderCode: number) => `payos:${orderCode}`;

function view(order: Payment) {
  return {
    orderCode: order.orderCode,
    orgId: order.orgId,
    planCode: order.planCode ?? null,
    packCode: order.packCode ?? null,
    topUpKind: order.topUpKind ?? null,
    topUpUnits: order.topUpUnits ?? null,
    purpose: order.purpose ?? 'subscription',
    contractId: order.contractId?.toString() ?? null,
    versionId: order.versionId?.toString() ?? null,
    pageCount: order.pageCount ?? null,
    reviewUnits: order.reviewUnits ?? null,
    action: order.action,
    amount: order.amount,
    currency: order.currency,
    status: order.status,
    checkoutUrl: order.checkoutUrl ?? null,
    qrCode: order.qrCode ?? null,
    expiresAt: order.expiresAt,
    paidAt: order.paidAt ?? null,
    fulfilledAt: order.fulfilledAt ?? null,
    fulfillmentError: order.fulfillmentError ?? null,
    providerError: order.providerError ?? null,
  };
}

export async function createPayment(
  userId: string,
  orgId: string,
  input: Purchase,
  idempotencyKey: string,
) {
  await requireSubscriptionAccess(userId, orgId, true);
  provider.getPayOS();
  const previous = await PaymentModel.findOne({ orgId, idempotencyKey });
  if (previous) return repeat(previous, input);
  const reviewQuote = isReviewPurchase(input)
    ? await contractReviewQuote(userId, orgId, input.contractId)
    : null;
  const topUp = isTopUp(input) ? await quoteTopUp(orgId, input.packCode) : null;
  const plan =
    !isReviewPurchase(input) && !isTopUp(input)
      ? await PlanModel.findOne({ code: input.planCode }).lean()
      : null;
  // The server decides the plan action and price; the client's action must agree.
  const planQuote =
    !isReviewPurchase(input) && !isTopUp(input)
      ? await quotePlanCheckout(userId, orgId, input.planCode)
      : null;
  if (planQuote) {
    if (planQuote.needsSchedule)
      throw AppError.conflict(
        'Gói thấp hơn được chọn bằng cách đặt lịch hạ gói, rồi thanh toán khi gia hạn.',
        'DOWNGRADE_NOT_SCHEDULED',
      );
    if (planQuote.action !== (input as { action: PaymentAction }).action)
      throw AppError.conflict(
        'Thông tin gói đã thay đổi. Vui lòng tải lại trang trước khi thanh toán.',
        'PLAN_QUOTE_CHANGED',
      );
    if (planQuote.blockReason)
      throw new AppError(
        planQuote.blockReason,
        planQuote.blockStatus ?? 409,
        true,
        planQuote.blockCode ?? undefined,
      );
  }
  if (isTopUp(input)) {
    if (topUp!.pack.price !== input.expectedAmount)
      throw AppError.conflict(
        'Giá gói mua thêm lượt đã thay đổi. Hãy kiểm tra lại trước khi thanh toán.',
        'TOP_UP_PRICE_CHANGED',
      );
  } else if (isReviewPurchase(input)) {
    if (
      !reviewQuote?.canPurchase ||
      reviewQuote.versionId !== input.versionId ||
      reviewQuote.amount !== input.expectedAmount
    )
      throw AppError.conflict(
        'Phí hoặc phiên bản hợp đồng đã thay đổi. Hãy kiểm tra lại trước khi thanh toán.',
        'REVIEW_QUOTE_CHANGED',
      );
  } else if (!plan || plan.price <= 0) throw AppError.badRequest('Vui lòng chọn gói trả phí.');
  const amount = reviewQuote?.amount ?? topUp?.pack.price ?? planQuote!.amount!;
  const itemName = reviewQuote
    ? 'Rà soát hợp đồng LawScan'
    : topUp
      ? `LawScan ${topUp.pack.name}`
      : plan!.name;
  const purchase = topUp
    ? {
        purpose: 'top_up',
        action: 'purchase',
        packCode: topUp.pack.code,
        topUpKind: topUp.pack.kind,
        topUpUnits: topUp.pack.units,
        subscriptionPeriodId: topUp.periodId,
      }
    : reviewQuote
    ? {
        purpose: 'contract_review',
        action: 'purchase',
        contractId: reviewQuote.contractId,
        versionId: reviewQuote.versionId,
        pageCount: reviewQuote.pageCount,
        // Units this purchase will hold once paid: earlier paid units plus the shortfall.
        reviewUnits: reviewQuote.paidUnits + reviewQuote.shortfallUnits,
        unitPrice: reviewQuote.unitPrice,
        ...(reviewQuote.carryPurchaseId ? { carryPurchaseId: reviewQuote.carryPurchaseId } : {}),
      }
    : input;
  const orderCode = randomInt(1_000_000_000_000, 10_000_000_000_000);
  await releaseAbandonedOrder(orgId, idempotencyKey);
  const { order, created } = await mongoose.connection.transaction(async (session) => {
    await lockSubscriptionOrganization(orgId, session);
    if (
      reviewQuote &&
      !(await ContractModel.exists({
        _id: reviewQuote.contractId,
        orgId,
        uploadedBy: userId,
      }).session(session))
    )
      throw AppError.notFound('Hợp đồng không còn tồn tại.');
    const existing = await PaymentModel.findOne({ orgId, idempotencyKey }).session(session);
    if (existing) return { order: existing, created: false };
    if (await PaymentModel.exists({ orgId, isOpen: true }).session(session)) {
      throw AppError.conflict(
        'Đang có đơn thanh toán chưa hoàn tất. Hãy kiểm tra hoặc hủy đơn đó trước khi tạo đơn mới.',
        'PAYMENT_IN_PROGRESS',
      );
    }
    const [order] = await PaymentModel.create(
      [
        {
          orgId,
          createdBy: userId,
          idempotencyKey,
          orderCode,
          ...purchase,
          amount,
          ...(planQuote ? { quotedAt: planQuote.quotedAt } : {}),
          expiresAt: new Date(Date.now() + 15 * 60_000),
        },
      ],
      { session },
    );
    return { order, created: true };
  });
  if (!created) return repeat(order, input);
  try {
    const link = await provider.createPaymentLink({
      orderCode,
      amount: order.amount,
      description: `LS ${orderCode}`,
      items: [{ name: itemName, quantity: 1, price: order.amount }],
      returnUrl: env.PAYOS_RETURN_URL,
      cancelUrl: env.PAYOS_CANCEL_URL,
      expiredAt: Math.floor(order.expiresAt.getTime() / 1000),
    });
    if (link.orderCode !== orderCode || link.amount !== order.amount || link.currency !== 'VND') {
      throw new AppError('Cổng thanh toán trả về thông tin đơn không khớp.', 502);
    }
    // A webhook may arrive before the create request returns. Never overwrite its state.
    await PaymentModel.updateOne(
      { _id: order._id },
      {
        $set: {
          paymentLinkId: link.paymentLinkId,
          checkoutUrl: link.checkoutUrl,
          qrCode: link.qrCode,
        },
      },
    );
    await PaymentModel.updateOne(
      { _id: order._id, status: 'creating' },
      { $set: { status: 'pending' } },
    );
    return view((await PaymentModel.findById(order._id))!);
  } catch {
    // A timeout does not prove that the provider failed to create the link.
    await PaymentModel.updateOne(
      { _id: order._id, status: 'creating' },
      {
        $set: {
          providerError: 'Chưa xác nhận được việc tạo đơn ở cổng thanh toán. Hãy kiểm tra hoặc hủy đơn này.',
        },
      },
    );
    throw new AppError(
      `Chưa xác nhận được đơn #${orderCode} ở cổng thanh toán. Hãy kiểm tra lại đơn trước khi thanh toán.`,
      502,
    );
  }
}

/**
 * A new checkout replaces an unpaid order whose payment link was confirmed, e.g. a
 * payOS tab the owner closed. payOS is asked to cancel it first; if it was paid in
 * the meantime it is settled instead and the new checkout stops, so nothing is
 * charged twice. A link payOS will no longer cancel (it expired) is read back
 * instead, and an order payOS never created is closed once its checkout window has
 * passed. Anything still uncertain (unreachable payOS, partial payment) keeps
 * blocking until it is synchronized or cancelled explicitly.
 */
async function releaseAbandonedOrder(orgId: string, idempotencyKey: string) {
  const open = await PaymentModel.findOne({ orgId, isOpen: true });
  // A retry of this same checkout returns that order; never cancel its own link.
  if (!open || open.idempotencyKey === idempotencyKey) return;
  try {
    if (isReplaceableOrder(open)) {
      try {
        await reconcile(open, await provider.cancelPaymentLink(open.orderCode));
      } catch {
        await refresh(open);
      }
    } else if (neverConfirmed(open) && open.expiresAt <= new Date()) await refresh(open);
    else return;
  } catch {
    return; // Leave it open; the transaction below reports the unfinished order.
  }
  const settled = await PaymentModel.findById(open._id);
  if (settled?.paidAt)
    throw AppError.conflict(
      `Đơn #${open.orderCode} vừa được thanh toán. Kiểm tra lại gói và lịch sử thanh toán trước khi tạo đơn mới.`,
      'PREVIOUS_ORDER_PAID',
    );
}

function repeat(order: Payment, input: Purchase) {
  const matches = isTopUp(input)
    ? order.purpose === 'top_up' &&
      order.packCode === input.packCode &&
      order.amount === input.expectedAmount
    : isReviewPurchase(input)
      ? order.purpose === 'contract_review' &&
        order.contractId?.toString() === input.contractId &&
        order.versionId?.toString() === input.versionId &&
        order.amount === input.expectedAmount
      : (order.purpose ?? 'subscription') === 'subscription' &&
        order.planCode === input.planCode;
  if (!matches || order.action !== input.action) {
    throw AppError.conflict('Mã yêu cầu thanh toán đã được dùng cho giao dịch khác. Vui lòng tải lại trang.');
  }
  return view(order);
}

const neverConfirmed = (order: Payment) => !order.paidAt && !order.paymentLinkId;

/**
 * payOS answered that it has no such order: creating its link failed or timed out
 * before payOS stored it. Nothing can be paid on it, so once its checkout window has
 * passed it is closed instead of blocking every later purchase of the account.
 */
async function closeNeverCreated(order: Payment, error: unknown) {
  if (!(error instanceof AppError) || error.code !== provider.PROVIDER_REJECTED || !neverConfirmed(order))
    throw error;
  if (order.expiresAt > new Date())
    throw AppError.conflict(
      `Cổng thanh toán chưa ghi nhận đơn #${order.orderCode}; chưa có khoản tiền nào bị trừ. Hãy kiểm tra lại sau ${order.expiresAt.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })} để đóng đơn.`,
      'PAYMENT_NOT_CREATED_YET',
    );
  await PaymentModel.updateOne(
    { _id: order._id, paidAt: null, paymentLinkId: null },
    { $set: { status: 'failed', isOpen: false }, $unset: { providerError: 1 } },
  );
  return view((await PaymentModel.findById(order._id))!);
}

/** Reads the order back from payOS and applies its state. */
async function refresh(order: Payment) {
  let remote: PaymentLink;
  try {
    remote = await provider.getPaymentLink(order.orderCode);
  } catch (error) {
    return closeNeverCreated(order, error);
  }
  return reconcile(order, remote);
}

async function ownedOrder(userId: string, orgId: string, orderCode: number) {
  await requireSubscriptionAccess(userId, orgId, true);
  const order = await PaymentModel.findOne({ orgId, orderCode });
  if (!order) throw AppError.notFound('Không tìm thấy đơn thanh toán.');
  return order;
}

export async function getPayment(userId: string, orgId: string, orderCode: number) {
  return view(await ownedOrder(userId, orgId, orderCode));
}

export async function listPayments(userId: string, orgId: string, page: number) {
  await requireSubscriptionAccess(userId, orgId, true);
  const orders = await PaymentModel.find({ orgId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * 20)
    .limit(20);
  return { items: orders.map(view), page, pageSize: 20 };
}

async function fulfill(order: Payment) {
  if (order.fulfilledAt) return;
  try {
    if (order.purpose === 'contract_review') {
      await activateContractReviewPurchase(order);
      await PaymentModel.updateOne(
        { _id: order._id, fulfilledAt: null },
        {
          $set: { fulfilledAt: new Date(), isOpen: false },
          $unset: { fulfillmentError: 1, providerError: 1 },
        },
      );
      return;
    }
    if (order.purpose === 'top_up') {
      await activateTopUp(
        {
          orgId: order.orgId.toString(),
          packCode: order.packCode!,
          amount: order.amount,
          paymentReference: reference(order.orderCode),
          periodId: order.subscriptionPeriodId?.toString(),
        },
        order.paidAt!,
      );
      await PaymentModel.updateOne(
        { _id: order._id, fulfilledAt: null },
        {
          $set: { fulfilledAt: new Date(), isOpen: false },
          $unset: { fulfillmentError: 1, providerError: 1 },
        },
      );
      return;
    }
    if (!order.planCode) throw AppError.conflict('Đơn thanh toán thiếu thông tin gói dịch vụ.');
    const period = await activatePaidSubscription(
      {
        orgId: order.orgId.toString(),
        planCode: order.planCode,
        action: order.action,
        amount: order.amount,
        paymentReference: reference(order.orderCode),
        orderedAt: order.quotedAt ?? order.createdAt,
      },
      order.paidAt!,
    );
    // Stable paymentReference makes a crash between activation and this update recoverable.
    await PaymentModel.updateOne(
      { _id: order._id, fulfilledAt: null },
      {
        $set: { fulfilledAt: new Date(), subscriptionPeriodId: period._id, isOpen: false },
        $unset: { fulfillmentError: 1, providerError: 1 },
      },
    );
  } catch (error) {
    await PaymentModel.updateOne(
      { _id: order._id, fulfilledAt: null },
      {
        $set: {
          fulfillmentError:
            error instanceof AppError ? error.message : 'Kích hoạt chưa thành công; hãy kiểm tra lại đơn.',
        },
      },
    );
    throw new AppError(
      'Đã nhận thanh toán nhưng chưa kích hoạt xong. Hãy bấm kiểm tra lại; không thanh toán thêm.',
      503,
    );
  }
}

async function reconcile(order: Payment, remote: PaymentLink) {
  if (
    remote.orderCode !== order.orderCode ||
    remote.amount !== order.amount ||
    (order.paymentLinkId && remote.id !== order.paymentLinkId)
  ) {
    throw AppError.conflict('Thông tin đơn ở cổng thanh toán không khớp với đơn đã lưu.');
  }
  if (remote.status === 'PAID') {
    if (remote.amountPaid !== order.amount || remote.amountRemaining !== 0) {
      throw AppError.conflict('Số tiền đã thanh toán không khớp với đơn; cần bộ phận hỗ trợ kiểm tra.');
    }
    // Serialize concurrent notifications; preserve the time first confirmed as paid.
    await PaymentModel.updateOne(
      { _id: order._id, paidAt: null },
      {
        $set: {
          status: 'paid',
          paidAt: new Date(),
          paymentLinkId: remote.id,
        },
      },
    );
    await fulfill((await PaymentModel.findById(order._id))!);
  } else if (['CANCELLED', 'EXPIRED', 'FAILED'].includes(remote.status)) {
    // Partially paid orders must not be silently discarded or allow another checkout.
    if (remote.amountPaid > 0) {
      await PaymentModel.updateOne(
        { _id: order._id, paidAt: null },
        {
          $set: {
            providerError:
              'Partial payment received; contact support before creating another order.',
          },
        },
      );
    } else {
      await PaymentModel.updateOne(
        { _id: order._id, paidAt: null },
        {
          $set: {
            status: remote.status.toLowerCase(),
            isOpen: false,
          },
          $unset: { providerError: 1 },
        },
      );
    }
  } else {
    await PaymentModel.updateOne(
      { _id: order._id, paidAt: null },
      {
        $set: {
          status: 'pending',
          paymentLinkId: remote.id,
        },
        $unset: { providerError: 1 },
      },
    );
  }
  return view((await PaymentModel.findById(order._id))!);
}

export async function syncPayment(userId: string, orgId: string, orderCode: number) {
  const order = await ownedOrder(userId, orgId, orderCode);
  if (order.fulfilledAt) return view(order);
  return refresh(order);
}

export async function cancelPayment(userId: string, orgId: string, orderCode: number) {
  const order = await ownedOrder(userId, orgId, orderCode);
  if (order.paidAt) throw AppError.conflict('Đơn đã thanh toán không thể hủy.');
  let remote: PaymentLink;
  try {
    remote = await provider.cancelPaymentLink(orderCode);
  } catch {
    // payOS refuses to cancel a link that expired or was never created; read its real state.
    return refresh(order);
  }
  // Cancellation can race with payment; the authoritative response may already be PAID.
  return reconcile(order, remote);
}

export async function receivePaymentWebhook(body: Webhook) {
  const data = await provider.verifyPaymentWebhook(body);
  const order = await PaymentModel.findOne({ orderCode: data.orderCode });
  // Signed setup probes and events unrelated to LawScan must not create orders.
  if (!order) return;
  if (data.code !== '00') return;
  if (
    data.currency !== 'VND' ||
    !Number.isSafeInteger(data.amount) ||
    data.amount <= 0 ||
    (order.paymentLinkId && data.paymentLinkId !== order.paymentLinkId)
  ) {
    throw AppError.badRequest('Webhook does not match the stored purchase');
  }
  if (order.fulfilledAt) return;
  // Reconcile total paid from payOS; webhook amount can be a partial transfer.
  await reconcile(order, await provider.getPaymentLink(order.orderCode));
}
