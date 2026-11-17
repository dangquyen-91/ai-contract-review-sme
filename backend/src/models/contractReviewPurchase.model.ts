import { Schema, model } from 'mongoose';

const schema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    contractId: { type: Schema.Types.ObjectId, ref: 'Contract', required: true },
    versionId: { type: Schema.Types.ObjectId, ref: 'ContractVersion', required: true },
    orderCode: { type: Number, required: true, unique: true },
    pageCount: { type: Number, required: true },
    units: { type: Number, required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['available', 'reserved', 'consumed'],
      default: 'available',
      required: true,
    },
    runId: { type: Schema.Types.ObjectId, ref: 'UsageRun' },
    // Chat questions about this contract included with the purchase. Purchases made
    // before this benefit existed have none, as sold.
    chatAllowance: { type: Number, default: 0, min: 0 },
    chatUsed: { type: Number, default: 0, min: 0 },
    chatReserved: { type: Number, default: 0, min: 0 },
    // Orders that topped this purchase up when it moved to a longer new version.
    extraOrderCodes: { type: [Number], default: undefined },
  },
  { timestamps: true },
);
schema.index({ orgId: 1, versionId: 1 }, { unique: true });
schema.index({ orgId: 1, userId: 1, contractId: 1, createdAt: 1 });
export const ContractReviewPurchaseModel = model('ContractReviewPurchase', schema);
