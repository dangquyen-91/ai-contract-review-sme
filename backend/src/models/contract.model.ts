import { Schema, model, Types, InferSchemaType } from 'mongoose';

export const CONTRACT_STATUSES = [
  'uploaded',
  'processing',
  'reviewed',
  'archived',
  'unsupported',
] as const;

export const CLASSIFICATION_STATUSES = ['pending', 'running', 'completed', 'failed'] as const;
export const CLASSIFICATION_OUTCOMES = [
  'supported',
  'unsupported_type',
  'not_contract',
  'not_allowed_for_account',
] as const;
export const CLASSIFICATION_SOURCES = ['ai', 'user'] as const;

const detectedPartySchema = new Schema(
  {
    name: { type: String, required: true },
    partyCode: { type: String },
  },
  { _id: false },
);

const classificationSchema = new Schema(
  {
    status: { type: String, enum: CLASSIFICATION_STATUSES, default: 'pending' },
    outcome: { type: String, enum: CLASSIFICATION_OUTCOMES },
    detectedLabel: { type: String },
    type: { type: String },
    ourParty: { type: String },
    confidence: { type: Number, min: 0, max: 1 },
    parties: { type: [detectedPartySchema], default: undefined },
    source: { type: String, enum: CLASSIFICATION_SOURCES },
    error: { type: String },
    startedAt: { type: Date },
    finishedAt: { type: Date },
    confirmedAt: { type: Date },
  },
  { _id: false },
);

const contractSchema = new Schema(
  {
    orgId: { type: Types.ObjectId, ref: 'Organization', required: true, index: true },
    uploadedBy: { type: Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, index: true },
    ourParty: { type: String },
    industry: { type: String, index: true },
    status: { type: String, enum: CONTRACT_STATUSES, default: 'uploaded', index: true },
    classification: { type: classificationSchema, default: undefined },
  },
  { timestamps: true },
);

contractSchema.index({ title: 'text' });
contractSchema.index(
  { status: 1, updatedAt: 1 },
  { partialFilterExpression: { status: 'unsupported' }, name: 'unsupported_cleanup' },
);

export type Contract = InferSchemaType<typeof contractSchema>;
export const ContractModel = model('Contract', contractSchema);

export function isContractConfirmed(contract: { type?: string | null }): contract is { type: string } {
  return Boolean(contract.type);
}
