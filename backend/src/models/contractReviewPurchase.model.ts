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
  },
  { timestamps: true },
);
schema.index({ orgId: 1, versionId: 1 }, { unique: true });
export const ContractReviewPurchaseModel = model('ContractReviewPurchase', schema);
