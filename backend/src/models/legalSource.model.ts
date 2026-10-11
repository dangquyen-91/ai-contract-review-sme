import { Schema, model, InferSchemaType } from 'mongoose';

export const LEGAL_SOURCE_TYPES = ['law', 'decree', 'circular', 'resolution', 'standard_template'] as const;

export const LEGAL_SOURCE_STATUSES = ['in_force', 'amended', 'repealed', 'not_yet_effective'] as const;

export const LEGAL_SOURCE_CODE_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

const legalCoverageSchema = new Schema(
  {
    structured: { type: Boolean, required: true },
    articleCount: { type: Number, required: true },
    firstArticle: { type: Number },
    lastArticle: { type: Number },
    expectedArticleCount: { type: Number },
    missingArticleCount: { type: Number, required: true },
    missingRanges: { type: [String], default: [] },
    suffixedArticles: { type: [String], default: [] },
    headingCount: { type: Number, required: true },
    chunkCount: { type: Number, required: true },
    complete: { type: Boolean, required: true },
    warnings: { type: [String], default: [] },
  },
  { _id: false },
);

const legalSourceSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    documentNumber: { type: String, trim: true },
    sourceType: { type: String, enum: LEGAL_SOURCE_TYPES, required: true, index: true },
    status: { type: String, enum: LEGAL_SOURCE_STATUSES, default: 'in_force', index: true },
    issuingBody: { type: String },
    citationLabel: { type: String, required: true },
    issuedDate: { type: Date },
    effectiveDate: { type: Date },
    expiryDate: { type: Date },
    coverage: { type: legalCoverageSchema },
  },
  { timestamps: true },
);

export type LegalSource = InferSchemaType<typeof legalSourceSchema>;
export type LegalCoverage = InferSchemaType<typeof legalCoverageSchema>;
export const LegalSourceModel = model('LegalSource', legalSourceSchema);
