import { Schema, model, InferSchemaType } from 'mongoose';

export const PLAN_CODES = [
  'personal_free',
  'personal_pro',
  'business_starter',
  'business_pro',
] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const planFields = {
  code: { type: String, enum: PLAN_CODES, required: true },
  name: { type: String, required: true },
  audience: { type: String, enum: ['personal', 'business'], required: true },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, enum: ['VND'], default: 'VND', required: true },
  analysisLimit: { type: Number, required: true, min: 0 },
  chatLimit: { type: Number, required: true, min: 0 },
  memberLimit: { type: Number, required: true, min: 1 },
} as const;
const planSchema = new Schema(planFields, { timestamps: true });
planSchema.index({ code: 1 }, { unique: true });
export const PlanModel = model('Plan', planSchema);
export type Plan = InferSchemaType<typeof planSchema>;

const subscriptionSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true },
    scheduledDowngrade: {
      type: new Schema(
        {
          planCode: { type: String, enum: PLAN_CODES, required: true },
          effectiveAt: { type: Date, required: true },
        },
        { _id: false },
      ),
      default: undefined,
    },
  },
  { timestamps: true },
);
export const OrganizationSubscriptionModel = model('OrganizationSubscription', subscriptionSchema);

const periodSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    key: { type: String, required: true, unique: true },
    plan: { type: new Schema(planFields, { _id: false }), required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    cancelledAt: Date,
    // Internal settlement reference only. No public API grants paid periods.
    paymentReference: { type: String, unique: true, sparse: true },
    paymentAction: { type: String, enum: ['purchase', 'renew', 'upgrade', 'downgrade'] },
    analysisUsed: { type: Number, default: 0, required: true },
    analysisReserved: { type: Number, default: 0, required: true },
    chatUsed: { type: Number, default: 0, required: true },
    chatReserved: { type: Number, default: 0, required: true },
  },
  { timestamps: true },
);
periodSchema.index({ orgId: 1, startsAt: -1, endsAt: -1 });
export const SubscriptionPeriodModel = model('SubscriptionPeriod', periodSchema);

const usageRunSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    contractId: { type: Schema.Types.ObjectId, ref: 'Contract', required: true },
    periodId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPeriod', required: true },
    kind: { type: String, enum: ['analysis', 'chat'], required: true },
    idempotencyKey: { type: String, required: true },
    fingerprint: { type: String, required: true },
    status: {
      type: String,
      enum: ['reserved', 'succeeded', 'failed'],
      default: 'reserved',
      required: true,
    },
    leaseExpiresAt: { type: Date, required: true },
    result: { type: Schema.Types.Mixed, select: false },
    error: String,
  },
  { timestamps: true },
);
usageRunSchema.index({ orgId: 1, kind: 1, idempotencyKey: 1 }, { unique: true });
usageRunSchema.index(
  { orgId: 1, contractId: 1 },
  {
    unique: true,
    partialFilterExpression: { kind: 'analysis', status: 'reserved' },
  },
);
export const UsageRunModel = model('UsageRun', usageRunSchema);

export async function initializeSubscriptionModels() {
  await Promise.all([
    PlanModel.init(),
    OrganizationSubscriptionModel.init(),
    SubscriptionPeriodModel.init(),
    UsageRunModel.init(),
  ]);
}
