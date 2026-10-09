import { Schema, model, Types, InferSchemaType } from 'mongoose';

export const RISK_LEVELS = ['high', 'medium', 'low', 'none'] as const;

export const EXTRACTION_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
  'unsupported',
] as const;

export const SEGMENTATION_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;

export const RISK_DETECTION_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;

export const SUMMARY_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;

const contractVersionSchema = new Schema(
  {
    contractId: { type: Types.ObjectId, ref: 'Contract', required: true, index: true },
    versionNumber: { type: Number, required: true },
    createdBy: { type: Types.ObjectId, ref: 'User', required: true },
    fileKey: { type: String },
    fileUrl: { type: String },
    fileResourceType: { type: String },
    fileName: { type: String },
    mimeType: { type: String },
    extractedText: { type: String, select: false },
    extractionStatus: { type: String, enum: EXTRACTION_STATUSES, default: 'pending', index: true },
    extractionError: { type: String },
    segmentationStatus: {
      type: String,
      enum: SEGMENTATION_STATUSES,
      default: 'pending',
      index: true,
    },
    segmentationError: { type: String },
    segmentationStartedAt: { type: Date },
    riskDetectionStatus: {
      type: String,
      enum: RISK_DETECTION_STATUSES,
      default: 'pending',
      index: true,
    },
    riskDetectionError: { type: String },
    riskDetectionStartedAt: { type: Date },
    overallAssessment: { type: [String], default: [] },
    overallRiskLevel: { type: String, enum: RISK_LEVELS, default: 'none', index: true },
    analysisFocus: { type: String },
    summaryPoints: { type: [String], default: [] },
    summaryStatus: { type: String, enum: SUMMARY_STATUSES, default: 'pending', index: true },
    summaryError: { type: String },
    summaryStartedAt: { type: Date },
  },
  { timestamps: true },
);

contractVersionSchema.index({ contractId: 1, versionNumber: -1 });

export type ContractVersion = InferSchemaType<typeof contractVersionSchema>;
export const ContractVersionModel = model('ContractVersion', contractVersionSchema);
