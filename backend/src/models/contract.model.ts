import { Schema, model, Types, InferSchemaType } from 'mongoose';

// sales = mua bán hàng hóa, service = cung ứng dịch vụ, labor = lao động, saas = thuê phần mềm/công nghệ
export const CONTRACT_TYPES = ['sales', 'service', 'labor', 'saas'] as const;

export const CONTRACT_STATUSES = [
  'uploaded',
  'processing',
  'reviewed',
  'archived',
] as const;

export const RISK_LEVELS = ['high', 'medium', 'low', 'none'] as const;

export const EXTRACTION_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
  'unsupported',
] as const;

export const SEGMENTATION_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;

const contractSchema = new Schema(
  {
    orgId: { type: Types.ObjectId, ref: 'Organization', required: true, index: true },
    uploadedBy: { type: Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: CONTRACT_TYPES, required: true, index: true },
    status: { type: String, enum: CONTRACT_STATUSES, default: 'uploaded', index: true },
    overallRiskLevel: { type: String, enum: RISK_LEVELS, default: 'none', index: true },
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
  },
  { timestamps: true },
);

contractSchema.index({ title: 'text' });

export type Contract = InferSchemaType<typeof contractSchema>;
export const ContractModel = model('Contract', contractSchema);
