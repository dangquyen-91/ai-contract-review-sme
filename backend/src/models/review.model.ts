import { Schema, model, Types, InferSchemaType } from 'mongoose';
import { RISK_LEVELS } from './contractVersion.model';
import { RISK_FINDING_TYPES, RISK_SEVERITIES } from './riskFinding.model';

export const REVIEW_STATUSES = ['queued', 'running', 'completed', 'failed'] as const;

export const REVIEW_STAGES = [
  'waiting_for_extraction',
  'segmentation',
  'summary',
  'risk_detection',
] as const;

export const REVIEW_STAGE_STATUSES = ['pending', 'running', 'completed', 'failed'] as const;

const stageStatus = { type: String, enum: REVIEW_STAGE_STATUSES, default: 'pending' };

const findingSnapshotSchema = new Schema(
  {
    findingType: { type: String, enum: RISK_FINDING_TYPES, required: true },
    severity: { type: String, enum: RISK_SEVERITIES, required: true },
    title: { type: String, required: true },
    clauseIndex: { type: Number },
    clauseTitle: { type: String },
  },
  { _id: false },
);

const reviewResultSchema = new Schema(
  {
    overallRiskLevel: { type: String, enum: RISK_LEVELS, required: true },
    overallAssessment: { type: [String], default: [] },
    summaryPoints: { type: [String], default: [] },
    clauseCount: { type: Number, required: true },
    findingCounts: {
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
    },
    findings: { type: [findingSnapshotSchema], default: [] },
  },
  { _id: false },
);

const reviewSchema = new Schema(
  {
    contractId: { type: Types.ObjectId, ref: 'Contract', required: true },
    versionId: { type: Types.ObjectId, ref: 'ContractVersion', required: true },
    orgId: { type: Types.ObjectId, ref: 'Organization', required: true, index: true },
    requestedBy: { type: Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: REVIEW_STATUSES, default: 'queued', index: true },
    activeLock: { type: Boolean },
    currentStage: { type: String, enum: REVIEW_STAGES },
    stageDetail: { type: String },
    stages: {
      segmentation: stageStatus,
      summary: stageStatus,
      riskDetection: stageStatus,
    },
    analysisFocus: { type: String },
    error: { type: String },
    startedAt: { type: Date },
    finishedAt: { type: Date },
    result: { type: reviewResultSchema, default: undefined },
  },
  { timestamps: true },
);

reviewSchema.index({ contractId: 1, createdAt: -1 });
reviewSchema.index(
  { contractId: 1 },
  { unique: true, partialFilterExpression: { activeLock: true }, name: 'one_active_review_per_contract' },
);

export type Review = InferSchemaType<typeof reviewSchema>;
export const ReviewModel = model('Review', reviewSchema);
