import { Schema, model, Types, InferSchemaType } from 'mongoose';

export const CONTRACT_STATUSES = [
  'uploaded',
  'processing',
  'reviewed',
  'archived',
] as const;

const contractSchema = new Schema(
  {
    orgId: { type: Types.ObjectId, ref: 'Organization', required: true, index: true },
    uploadedBy: { type: Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, required: true, index: true },
    ourParty: { type: String },
    industry: { type: String, index: true },
    status: { type: String, enum: CONTRACT_STATUSES, default: 'uploaded', index: true },
  },
  { timestamps: true },
);

contractSchema.index({ title: 'text' });

export type Contract = InferSchemaType<typeof contractSchema>;
export const ContractModel = model('Contract', contractSchema);
