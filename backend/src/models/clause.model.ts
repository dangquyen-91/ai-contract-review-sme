import { Schema, model, Types, InferSchemaType } from 'mongoose';

export const CLAUSE_CATEGORIES = [
  'payment',
  'confidentiality',
  'termination',
  'penalty',
  'indemnity',
  'intellectual_property',
  'dispute_resolution',
  'liability',
  'force_majeure',
  'renewal',
  'warranty',
  'other',
] as const;

const clauseSchema = new Schema(
  {
    contractId: { type: Types.ObjectId, ref: 'Contract', required: true, index: true },
    orgId: { type: Types.ObjectId, ref: 'Organization', required: true, index: true },
    index: { type: Number, required: true },
    title: { type: String },
    text: { type: String, required: true },
    category: { type: String, enum: CLAUSE_CATEGORIES, required: true, index: true },
    summary: { type: String, required: true },
  },
  { timestamps: true },
);

clauseSchema.index({ contractId: 1, index: 1 });
clauseSchema.index({ orgId: 1, category: 1 });

export type Clause = InferSchemaType<typeof clauseSchema>;
export const ClauseModel = model('Clause', clauseSchema);
