import { randomInt } from 'crypto';
import mongoose, { HydratedDocument } from 'mongoose';
import type { PaymentLink, Webhook } from '@payos/node';
import { env } from '../../config/env';
import { AppError } from '../../errors/AppError';
import { ContractModel } from '../../models/contract.model';
import { PaymentAction, PaymentModel, Payment as PaymentData } from '../../models/payment.model';
import { PlanCode, PlanModel } from '../../models/subscription.model';
import {
  activatePaidSubscription,
  lockSubscriptionOrganization,
  requireSubscriptionAccess,
  validatePaidSubscriptionPurchase,
} from './subscription.service';
import * as provider from './payos.service';
import {
  contractReviewQuote,
  activateContractReviewPurchase,
} from './contractReviewPurchase.service';

type Payment = HydratedDocument<PaymentData>;
type Purchase =
  | { planCode: PlanCode; action: PaymentAction }
  | {
      purpose: 'contract_review';
      action: 'purchase';
      contractId: string;
      versionId: string;
      expectedAmount: number;
    };
const isReviewPurchase = (
  input: Purchase,
): input is Extract<Purchase, { purpose: 'contract_review' }> =>
  'purpose' in input && input.purpose === 'contract_review';
const reference = (orderCode: number) => `payos:${orderCode}`;

function view(order: Payment) {
  return {
    orderCode: order.orderCode,
    orgId: order.orgId,
    planCode: order.planCode,
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
  const plan = !isReviewPurchase(input)
    ? await PlanModel.findOne({ code: input.planCode }).lean()
    : null;
  if (isReviewPurchase(input)) {
    if (
      !reviewQuote?.canPurchase ||
      reviewQuote.versionId !== input.versionId ||
      reviewQuote.amount !== input.expectedAmount
    )
      throw AppError.conflict(
        'Phí hoặc phiên bản hợp đồng đã thay đổi. Hãy kiểm tra lại trước khi thanh toán.',
        'REVIEW_QUOTE_CHANGED',
      );
  } else if (!plan || plan.price <= 0) throw AppError.badRequest('Choose a paid plan');
  const amount = reviewQuote?.amount ?? plan!.price;
  const itemName = reviewQuote ? 'Rà soát hợp đồng LawScan' : plan!.name;
  const purchase = reviewQuote
    ? {
        purpose: 'contract_review',
        action: 'purchase',
        contractId: reviewQuote.contractId,
        versionId: reviewQuote.versionId,
        pageCount: reviewQuote.pageCount,
        reviewUnits: reviewQuote.units,
        unitPrice: reviewQuote.unitPrice,
      }
    : input;
  const orderCode = randomInt(1_000_000_000_000, 10_000_000_000_000);
  if (!isReviewPurchase(input))
    await validatePaidSubscriptionPurchase({
      orgId,
      ...input,
      amount,
      paymentReference: reference(orderCode),
    });
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
      throw AppError.conflict('An unfinished payment exists. Synchronize or cancel it first.');
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
      throw new AppError('payOS returned mismatched order information', 502);
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
          providerError: 'Payment creation was not confirmed. Synchronize or cancel this order.',
        },
      },
    );
    throw new AppError(`Payment creation was not confirmed. Synchronize order ${orderCode}.`, 502);
  }
}

function repeat(order: Payment, input: Purchase) {
  const matches = isReviewPurchase(input)
    ? order.purpose === 'contract_review' &&
      order.contractId?.toString() === input.contractId &&
      order.versionId?.toString() === input.versionId &&
      order.amount === input.expectedAmount
    : order.purpose !== 'contract_review' && order.planCode === input.planCode;
  if (!matches || order.action !== input.action) {
    throw AppError.conflict('Idempotency-Key was already used for another purchase');
  }
  return view(order);
}

async function ownedOrder(userId: string, orgId: string, orderCode: number) {
  await requireSubscriptionAccess(userId, orgId, true);
  const order = await PaymentModel.findOne({ orgId, orderCode });
  if (!order) throw AppError.notFound('Payment not found');
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
    if (!order.planCode) throw AppError.conflict('Missing subscription plan');
    const period = await activatePaidSubscription(
      {
        orgId: order.orgId.toString(),
        planCode: order.planCode,
        action: order.action,
        amount: order.amount,
        paymentReference: reference(order.orderCode),
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
            error instanceof AppError ? error.message : 'Activation failed; retry synchronization.',
        },
      },
    );
    throw new AppError('Payment received, but activation is pending. Retry synchronization.', 503);
  }
}

async function reconcile(order: Payment, remote: PaymentLink) {
  if (
    remote.orderCode !== order.orderCode ||
    remote.amount !== order.amount ||
    (order.paymentLinkId && remote.id !== order.paymentLinkId)
  ) {
    throw AppError.conflict('payOS order information does not match the stored purchase');
  }
  if (remote.status === 'PAID') {
    if (remote.amountPaid !== order.amount || remote.amountRemaining !== 0) {
      throw AppError.conflict(
        'Paid amount does not match the stored purchase; manual review required',
      );
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
  return reconcile(order, await provider.getPaymentLink(orderCode));
}

export async function cancelPayment(userId: string, orgId: string, orderCode: number) {
  const order = await ownedOrder(userId, orgId, orderCode);
  if (order.paidAt) throw AppError.conflict('A paid order cannot be cancelled here');
  // Cancellation can race with payment; the authoritative response may already be PAID.
  return reconcile(order, await provider.cancelPaymentLink(orderCode));
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
