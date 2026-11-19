import { Schema, model, InferSchemaType } from 'mongoose';
import { PLAN_CODES, TOP_UP_PACK_CODES, USAGE_KINDS } from './subscription.model';

export const PAYMENT_ACTIONS = ['purchase', 'renew', 'upgrade', 'downgrade'] as const;
export type PaymentAction = (typeof PAYMENT_ACTIONS)[number];

const schema = new Schema(
  {
    orderCode: { type: Number, required: true, unique: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    idempotencyKey: { type: String, required: true },
    purpose: {
      type: String,
      enum: ['subscription', 'contract_review', 'top_up'],
      default: 'subscription',
    },
    planCode: {
      type: String,
      enum: PLAN_CODES,
      required: function (this: { purpose?: string }) {
        return !this.purpose || this.purpose === 'subscription';
      },
    },
    packCode: {
      type: String,
      enum: TOP_UP_PACK_CODES,
      required: function (this: { purpose?: string }) {
        return this.purpose === 'top_up';
      },
    },
    topUpKind: { type: String, enum: USAGE_KINDS },
    topUpUnits: Number,
    contractId: { type: Schema.Types.ObjectId, ref: 'Contract' },
    versionId: { type: Schema.Types.ObjectId, ref: 'ContractVersion' },
    pageCount: Number,
    reviewUnits: Number,
    // Unused paid review of an earlier version that this order tops up.
    carryPurchaseId: { type: Schema.Types.ObjectId, ref: 'ContractReviewPurchase' },
    unitPrice: Number,
    action: { type: String, enum: PAYMENT_ACTIONS, required: true },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, enum: ['VND'], default: 'VND', required: true },
    status: {
      type: String,
      enum: ['creating', 'pending', 'paid', 'cancelled', 'expired', 'failed'],
      default: 'creating',
      required: true,
    },
    // Keep a paid but unfulfilled order open until it can be recovered.
    isOpen: { type: Boolean, default: true, required: true },
    paymentLinkId: String,
    checkoutUrl: String,
    qrCode: String,
    expiresAt: { type: Date, required: true },
    // Moment the plan price was quoted; settlement re-validates against it.
    quotedAt: Date,
    paidAt: Date,
    fulfilledAt: Date,
    subscriptionPeriodId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPeriod' },
    fulfillmentError: String,
    providerError: String,
  },
  { timestamps: true },
);
schema.index({ orgId: 1, idempotencyKey: 1 }, { unique: true });
schema.index({ status: 1, currency: 1, paidAt: 1, orgId: 1 }, { name: 'report_paid_receipts' });
schema.index({ orgId: 1 }, { unique: true, partialFilterExpression: { isOpen: true } });
export const PaymentModel = model('Payment', schema);

/**
 * An unpaid order whose payOS link was confirmed can be replaced by a new checkout
 * (it is cancelled with payOS first). Paid, partially paid or unconfirmed orders
 * must be resolved before another checkout.
 */
export const isReplaceableOrder = (order: {
  paidAt?: Date | null;
  paymentLinkId?: string | null;
  providerError?: string | null;
}) => !order.paidAt && Boolean(order.paymentLinkId) && !order.providerError;
export type Payment = InferSchemaType<typeof schema>;
