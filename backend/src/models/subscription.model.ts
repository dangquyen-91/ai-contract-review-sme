import { Schema, model, InferSchemaType } from 'mongoose';

export const PLAN_CODES = [
  'personal_free',
  'personal_pro',
  'business_starter',
  'business_pro',
  // Granted once per organization owner; never sold or listed in the catalog.
  'business_trial',
] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const planFields = {
  code: { type: String, enum: PLAN_CODES, required: true },
  name: { type: String, required: true },
  audience: { type: String, enum: ['personal', 'business'], required: true },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, enum: ['VND'], default: 'VND', required: true },
  analysisLimit: { type: Number, required: true, min: 0 },
  draftingLimit: { type: Number, default: 0, min: 0 },
  chatLimit: { type: Number, required: true, min: 0 },
  memberLimit: { type: Number, required: true, min: 1 },
} as const;
const planSchema = new Schema(planFields, { timestamps: true });
planSchema.index({ code: 1 }, { unique: true });
export const PlanModel = model('Plan', planSchema);
export type Plan = InferSchemaType<typeof planSchema>;

export const SUBSCRIPTION_ACCOUNT_TYPES = ['organization', 'personal'] as const;

const subscriptionSchema = new Schema(
  {
    accountType: { type: String, enum: SUBSCRIPTION_ACCOUNT_TYPES, required: true },
    orgId: {
      type: Schema.Types.ObjectId,
      ref: function (this: { accountType?: string }) {
        return this.accountType === 'personal' ? 'User' : 'Organization';
      },
      required: true,
      unique: true,
    },
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
export const SubscriptionModel = model('Subscription', subscriptionSchema);

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
    // What was actually charged; an upgrade is discounted by the unused paid time.
    paidAmount: { type: Number, min: 0 },
    analysisUsed: { type: Number, default: 0, required: true },
    analysisReserved: { type: Number, default: 0, required: true },
    draftingUsed: { type: Number, default: 0, required: true },
    draftingReserved: { type: Number, default: 0, required: true },
    chatUsed: { type: Number, default: 0, required: true },
    chatReserved: { type: Number, default: 0, required: true },
    // Purchased top-up units, added to the plan limit for this period only.
    analysisBonus: { type: Number, default: 0, min: 0 },
    draftingBonus: { type: Number, default: 0, min: 0 },
    chatBonus: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);
periodSchema.index({ orgId: 1, startsAt: -1, endsAt: -1 });
export const SubscriptionPeriodModel = model('SubscriptionPeriod', periodSchema);

export const USAGE_KINDS = ['analysis', 'chat', 'drafting'] as const;
export const TOP_UP_PACK_CODES = [
  'personal_analysis_10',
  'personal_chat_100',
  'personal_drafting_10',
  'business_analysis_50',
  'business_chat_300',
  'business_drafting_30',
] as const;
export type TopUpPackCode = (typeof TOP_UP_PACK_CODES)[number];

const topUpPackSchema = new Schema(
  {
    code: { type: String, enum: TOP_UP_PACK_CODES, required: true },
    name: { type: String, required: true },
    audience: { type: String, enum: ['personal', 'business'], required: true },
    kind: { type: String, enum: USAGE_KINDS, required: true },
    units: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 1 },
    currency: { type: String, enum: ['VND'], default: 'VND', required: true },
  },
  { timestamps: true },
);
topUpPackSchema.index({ code: 1 }, { unique: true });
export const TopUpPackModel = model('TopUpPack', topUpPackSchema);

// Ledger of credited top-ups; the unique payment reference makes settlement idempotent.
const usageTopUpSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, required: true, index: true },
    periodId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPeriod', required: true },
    packCode: { type: String, enum: TOP_UP_PACK_CODES, required: true },
    kind: { type: String, enum: USAGE_KINDS, required: true },
    units: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 1 },
    paymentReference: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);
export const UsageTopUpModel = model('UsageTopUp', usageTopUpSchema);

const usageRunSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    contractId: { type: Schema.Types.ObjectId, ref: 'Contract' },
    draftId: { type: Schema.Types.ObjectId, ref: 'ContractDraft' },
    periodId: {
      type: Schema.Types.ObjectId,
      ref: 'SubscriptionPeriod',
      required: function (this: { reviewPurchaseId?: unknown }) {
        return !this.reviewPurchaseId;
      },
    },
    reviewPurchaseId: { type: Schema.Types.ObjectId, ref: 'ContractReviewPurchase' },
    kind: { type: String, enum: ['analysis', 'chat', 'drafting'], required: true },
    units: { type: Number, default: 1, min: 1, required: true },
    // Part of a paid review's units taken from the plan quota (reviewPurchaseId + periodId).
    planUnits: { type: Number, default: 0, min: 0 },
    pageCount: { type: Number, min: 1 },
    versionId: { type: Schema.Types.ObjectId, ref: 'ContractVersion' },
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
usageRunSchema.index({ status: 1, updatedAt: 1, orgId: 1, kind: 1 }, { name: 'report_consumed_units' });
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
    SubscriptionModel.init(),
    SubscriptionPeriodModel.init(),
    UsageRunModel.init(),
    TopUpPackModel.init(),
    UsageTopUpModel.init(),
  ]);
}
