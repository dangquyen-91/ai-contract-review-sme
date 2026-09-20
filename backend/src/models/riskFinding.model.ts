import { Schema, model, Types, InferSchemaType } from 'mongoose';
import { CLAUSE_CATEGORIES } from './clause.model';

export const RISK_FINDING_TYPES = ['clause_risk', 'missing_clause'] as const;

export const RISK_SEVERITIES = ['high', 'medium', 'low'] as const;

export const RISK_FINDING_STATUSES = ['open', 'acknowledged', 'dismissed', 'resolved'] as const;

export const RISK_DETECTED_BY = ['rule', 'llm', 'hybrid'] as const;

const riskFindingSchema = new Schema(
  {
    contractId: { type: Types.ObjectId, ref: 'Contract', required: true, index: true },
    orgId: { type: Types.ObjectId, ref: 'Organization', required: true, index: true },
    clauseId: { type: Types.ObjectId, ref: 'Clause', default: null },
    expectedClauseCategory: { type: String, enum: CLAUSE_CATEGORIES, default: null },
    findingType: { type: String, enum: RISK_FINDING_TYPES, required: true },
    severity: { type: String, enum: RISK_SEVERITIES, required: true },
    title: { type: String, required: true },
    explanation: { type: String, required: true },
    suggestedRevision: { type: String },
    status: { type: String, enum: RISK_FINDING_STATUSES, default: 'open', index: true },
    detectedBy: { type: String, enum: RISK_DETECTED_BY, required: true },
  },
  { timestamps: true },
);

riskFindingSchema.index({ contractId: 1, status: 1 });
riskFindingSchema.index({ orgId: 1, severity: 1 });

export type RiskFinding = InferSchemaType<typeof riskFindingSchema>;
export const RiskFindingModel = model('RiskFinding', riskFindingSchema);
