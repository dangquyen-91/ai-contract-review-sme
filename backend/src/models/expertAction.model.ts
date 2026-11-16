import { Schema, model, Types, InferSchemaType } from 'mongoose';
import { RISK_CODES, RISK_FINDING_TYPES, RISK_SEVERITIES } from './riskFinding.model';

export const EXPERT_ACTIONS = ['confirm', 'adjust', 'reject', 'add', 'remove'] as const;

const findingSnapshotSchema = new Schema(
  {
    findingType: { type: String, enum: RISK_FINDING_TYPES },
    severity: { type: String, enum: RISK_SEVERITIES },
    riskCode: { type: String, enum: RISK_CODES },
    title: { type: String },
    problem: { type: [String], default: undefined },
    consequences: { type: [String], default: undefined },
    recommendations: { type: [String], default: undefined },
    clauseIndex: { type: Number },
  },
  { _id: false },
);

const expertActionSchema = new Schema(
  {
    expertReviewId: { type: Types.ObjectId, ref: 'ExpertReview', required: true },
    orgId: { type: Types.ObjectId, ref: 'Organization', required: true },
    riskFindingId: { type: Types.ObjectId, ref: 'RiskFinding', required: true },
    expertId: { type: Types.ObjectId, ref: 'User', required: true },
    attempt: { type: Number, required: true },
    action: { type: String, enum: EXPERT_ACTIONS, required: true },
    reason: { type: String },
    before: { type: findingSnapshotSchema, default: undefined },
    after: { type: findingSnapshotSchema, default: undefined },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

expertActionSchema.index({ expertReviewId: 1, riskFindingId: 1, createdAt: -1 });

export type ExpertAction = InferSchemaType<typeof expertActionSchema>;
export const ExpertActionModel = model('ExpertAction', expertActionSchema);
