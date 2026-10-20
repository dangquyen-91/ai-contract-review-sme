import { Schema, model, InferSchemaType } from 'mongoose';
import { PLAN_CODES } from './subscription.model';

export const PAYMENT_ACTIONS = ['purchase', 'renew', 'upgrade', 'downgrade'] as const;
export type PaymentAction = (typeof PAYMENT_ACTIONS)[number];

const schema = new Schema(
  {
    orderCode: { type: Number, required: true, unique: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    idempotencyKey: { type: String, required: true },
    planCode: { type: String, enum: PLAN_CODES, required: true },
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
    paidAt: Date,
    fulfilledAt: Date,
    subscriptionPeriodId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPeriod' },
    fulfillmentError: String,
    providerError: String,
  },
  { timestamps: true },
);
schema.index({ orgId: 1, idempotencyKey: 1 }, { unique: true });
schema.index({ orgId: 1 }, { unique: true, partialFilterExpression: { isOpen: true } });
export const PaymentModel = model('Payment', schema);
export type Payment = InferSchemaType<typeof schema>;
