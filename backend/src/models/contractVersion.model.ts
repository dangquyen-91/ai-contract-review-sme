import { Schema, model, Types, InferSchemaType } from 'mongoose';
import { decryptOnSerialize, encryptedString } from '../utils/fieldEncryption';

export const EXTRACTION_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
  'unsupported',
] as const;

export const EXTRACTION_METHODS = ['text_layer', 'ocr', 'mixed', 'docx'] as const;

export const SEGMENTATION_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;

const extractionQualitySchema = new Schema(
  {
    method: { type: String, enum: EXTRACTION_METHODS, required: true },
    pageCount: { type: Number },
    ocrPageCount: { type: Number, required: true },
    ocrConfidence: { type: Number },
    lowConfidence: { type: Boolean, required: true },
    truncatedAtPage: { type: Number },
  },
  { _id: false },
);

const extractionProgressSchema = new Schema(
  {
    processedPages: { type: Number, required: true },
    totalPages: { type: Number, required: true },
  },
  { _id: false },
);

const redactionSummarySchema = new Schema(
  {
    total: { type: Number, required: true },
    counts: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

export const RISK_DETECTION_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;

export const SUMMARY_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;

export const keyTermSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String },
    numberValue: { type: Number },
    booleanValue: { type: Boolean },
    textValue: { type: String, ...encryptedString },
    deferred: { type: Boolean },
    clauseId: { type: Types.ObjectId, ref: 'Clause' },
    quote: { type: String, ...encryptedString },
  },
  { _id: false, ...decryptOnSerialize },
);

export const summarySourceSchema = new Schema(
  {
    pointIndex: { type: Number, required: true },
    clauseIndex: { type: Number, required: true },
    quote: { type: String, required: true, ...encryptedString },
    startOffset: { type: Number },
    endOffset: { type: Number },
  },
  { _id: false, ...decryptOnSerialize },
);

export const assessmentSourceSchema = new Schema(
  {
    pointIndex: { type: Number, required: true },
    checkCodes: { type: [String], default: [] },
  },
  { _id: false },
);

export const issueCountsSchema = new Schema(
  {
    violations: { type: Number, default: 0 },
    unclear: { type: Number, default: 0 },
    missing: { type: Number, default: 0 },
    negotiable: { type: Number, default: 0 },
    drafting: { type: Number, default: 0 },
    unverified: { type: Number, default: 0 },
    referrals: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false },
);

export const checkCoverageSchema = new Schema(
  {
    playbookVersion: { type: String },
    checks: { type: Number, default: 0 },
    passed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    notApplicable: { type: Number, default: 0 },
    notChecked: { type: Number, default: 0 },
    unverified: { type: Number, default: 0 },
    documentChecks: { type: Number, default: 0 },
    clauseTypesWithoutPlaybook: { type: [String], default: [] },
    uncoveredTopics: {
      type: [new Schema({ code: String, name: String }, { _id: false })],
      default: [],
    },
    notCheckedItems: {
      type: [new Schema({ code: String, title: String, reason: String }, { _id: false })],
      default: [],
    },
    passedItems: {
      type: [new Schema({ code: String, title: String }, { _id: false })],
      default: [],
    },
  },
  { _id: false },
);

const contractVersionSchema = new Schema(
  {
    contractId: { type: Types.ObjectId, ref: 'Contract', required: true, index: true },
    versionNumber: { type: Number, required: true },
    createdBy: { type: Types.ObjectId, ref: 'User', required: true },
    fileKey: { type: String },
    fileResourceType: { type: String },
    fileDeliveryType: { type: String },
    fileFormat: { type: String },
    fileName: { type: String },
    mimeType: { type: String },
    fileHash: { type: String, index: true },
    note: { type: String, trim: true, maxlength: 300 },
    extractedText: { type: String, select: false, ...encryptedString },
    textSignature: { type: [Number], default: undefined, select: false },
    textSignatureVersion: { type: Number, select: false },
    extractionStatus: { type: String, enum: EXTRACTION_STATUSES, default: 'pending', index: true },
    extractionError: { type: String },
    extractionErrorCode: { type: String },
    extractionStartedAt: { type: Date },
    extractionProgress: { type: extractionProgressSchema, default: undefined },
    extractionQuality: { type: extractionQualitySchema, default: undefined },
    redactionSummary: { type: redactionSummarySchema, default: undefined },
    segmentationStatus: {
      type: String,
      enum: SEGMENTATION_STATUSES,
      default: 'pending',
      index: true,
    },
    segmentationError: { type: String },
    segmentationStartedAt: { type: Date },
    segmentationReviewId: { type: Types.ObjectId, ref: 'Review' },
    riskDetectionStatus: {
      type: String,
      enum: RISK_DETECTION_STATUSES,
      default: 'pending',
      index: true,
    },
    riskDetectionError: { type: String },
    riskDetectionStartedAt: { type: Date },
    riskDetectionReviewId: { type: Types.ObjectId, ref: 'Review' },
    overallAssessment: { type: [String], default: [] },
    assessmentSources: { type: [assessmentSourceSchema], default: undefined },
    keyTerms: { type: [keyTermSchema], default: undefined },
    keyTermsExtractedAt: { type: Date },
    issueCounts: { type: issueCountsSchema, default: undefined },
    checkCoverage: { type: checkCoverageSchema, default: undefined },
    analysisFocus: { type: String },
    summaryPoints: { type: [String], default: [] },
    summarySources: { type: [summarySourceSchema], default: undefined },
    summaryStatus: { type: String, enum: SUMMARY_STATUSES, default: 'pending', index: true },
    summaryError: { type: String },
    summaryStartedAt: { type: Date },
    summaryReviewId: { type: Types.ObjectId, ref: 'Review' },
  },
  { timestamps: true, ...decryptOnSerialize },
);

contractVersionSchema.index({ contractId: 1, versionNumber: -1 });

export type ContractVersion = InferSchemaType<typeof contractVersionSchema>;
export const ContractVersionModel = model('ContractVersion', contractVersionSchema);
