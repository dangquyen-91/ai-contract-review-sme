import { Schema, model, Types, InferSchemaType } from 'mongoose';
import { decryptOnSerialize, encryptedString } from '../utils/fieldEncryption';

export const RISK_FINDING_TYPES = ['clause_risk', 'missing_clause', 'referral'] as const;

export const RISK_SEVERITIES = ['high', 'medium', 'low'] as const;

export const RISK_FINDING_STATUSES = ['open', 'acknowledged', 'dismissed', 'resolved'] as const;

export const RISK_DETECTED_BY = [
  'rule',
  'llm',
  'hybrid',
  'checklist',
  'expert',
  'playbook',
  'document_check',
  'expert_referral',
] as const;

export const FINDING_VERDICTS = ['confirmed', 'adjusted', 'rejected', 'added'] as const;

export const FINDING_GROUPS = ['clarity', 'completeness', 'balance', 'compliance', 'referral'] as const;

export const FINDING_OUTCOMES = ['failed', 'unverified', 'referral'] as const;

export const RISK_CODES = [
  'UNLAWFUL_TERM',
  'MISSING_MANDATORY_FORM',
  'UNILATERAL_TERMINATION',
  'AUTO_RENEWAL',
  'EXCESSIVE_PENALTY',
  'LIABILITY_LIMITATION',
  'ONE_SIDED_INDEMNITY',
  'UNFAVORABLE_PAYMENT',
  'ONE_SIDED_OBLIGATION',
  'BROAD_EXCLUSION',
  'IP_DATA_RISK',
  'UNFAVORABLE_DISPUTE_FORUM',
  'VAGUE_SCOPE',
  'AMBIGUOUS_TERM',
  'MISSING_CLAUSE',
  'MISSING_PROTECTION',
  'OTHER',
] as const;

export const LEGAL_BASIS_VERIFICATIONS = [
  'verified',
  'partially_verified',
  'article_not_found',
  'not_in_knowledge_base',
  'unreferenced',
] as const;

export const LEGAL_BASIS_ROLES = ['basis', 'fallback', 'reference'] as const;

export const BASIS_KINDS = ['criterion', 'practice', 'policy', 'law'] as const;

const legalBasisSchema = new Schema(
  {
    text: { type: String, required: true },
    legalKnowledgeChunkIds: { type: [Types.ObjectId], ref: 'LegalKnowledgeChunk', default: [] },
    verification: { type: String, enum: LEGAL_BASIS_VERIFICATIONS },
    role: { type: String, enum: LEGAL_BASIS_ROLES },
  },
  { _id: false },
);

const proposedRevisionSchema = new Schema(
  {
    originalText: { type: String, ...encryptedString },
    revisedText: { type: String, required: true, ...encryptedString },
    reason: { type: String },
    isEdited: { type: Boolean, default: false },
  },
  { _id: false, ...decryptOnSerialize },
);

const findingVerificationSchema = new Schema(
  {
    verdict: { type: String, enum: FINDING_VERDICTS, required: true },
    originalSeverity: { type: String, enum: RISK_SEVERITIES },
    originalGroup: { type: String, enum: FINDING_GROUPS },
    reason: { type: String },
    verifiedBy: { type: Types.ObjectId, ref: 'User', required: true },
    verifiedAt: { type: Date, required: true },
  },
  { _id: false },
);

const findingEvidenceSchema = new Schema(
  {
    fieldKey: { type: String },
    label: { type: String },
    quote: { type: String, ...encryptedString },
    clauseIndex: { type: Number },
    startOffset: { type: Number },
    endOffset: { type: Number },
    value: { type: Schema.Types.Mixed },
  },
  { _id: false, ...decryptOnSerialize },
);

const findingBasisSchema = new Schema(
  {
    kind: { type: String, enum: BASIS_KINDS, required: true },
    statement: { type: String, required: true },
  },
  { _id: false },
);

const riskFindingSchema = new Schema(
  {
    contractVersionId: {
      type: Types.ObjectId,
      ref: 'ContractVersion',
      required: true,
      index: true,
    },
    reviewId: { type: Types.ObjectId, ref: 'Review', required: true, index: true },
    orgId: { type: Types.ObjectId, ref: 'Organization', required: true, index: true },
    clauseId: { type: Types.ObjectId, ref: 'Clause', default: null },
    expectedClauseTypeId: { type: Types.ObjectId, ref: 'ClauseTypeTaxonomy', default: null },
    findingType: { type: String, enum: RISK_FINDING_TYPES, required: true },
    severity: { type: String, enum: RISK_SEVERITIES },
    checkCode: { type: String },
    checkGroup: { type: String, enum: FINDING_GROUPS },
    outcome: { type: String, enum: FINDING_OUTCOMES },
    label: { type: String },
    playbookVersion: { type: String },
    neutral: { type: Boolean },
    evidence: { type: [findingEvidenceSchema], default: undefined },
    observed: { type: Schema.Types.Mixed },
    limit: { type: Number },
    vagueTerm: { type: String },
    reason: { type: String },
    question: { type: String },
    basis: { type: findingBasisSchema, default: undefined },
    noVerifiedLegalBasis: { type: Boolean },
    title: { type: String, required: true },
    problem: { type: [String], default: [] },
    consequences: { type: [String], default: [] },
    legalBasis: { type: [legalBasisSchema], default: [] },
    recommendations: { type: [String], default: [] },
    proposedRevision: { type: proposedRevisionSchema, default: undefined },
    status: { type: String, enum: RISK_FINDING_STATUSES, default: 'open', index: true },
    detectedBy: { type: String, enum: RISK_DETECTED_BY, required: true },
    riskCode: { type: String, enum: RISK_CODES },
    ruleCode: { type: String },
    ruleVersion: { type: Number },
    verification: { type: findingVerificationSchema, default: undefined },
  },
  { timestamps: true, ...decryptOnSerialize },
);

riskFindingSchema.index({ contractVersionId: 1, status: 1 });
riskFindingSchema.index({ orgId: 1, checkGroup: 1 });

export type RiskFinding = InferSchemaType<typeof riskFindingSchema>;
export const RiskFindingModel = model('RiskFinding', riskFindingSchema);
