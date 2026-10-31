import { Schema, model, Types, InferSchemaType } from 'mongoose';

export const EXPERT_REVIEW_STATUSES = ['requested', 'in_progress', 'approved', 'returned'] as const;

export const OPEN_EXPERT_REVIEW_STATUSES: (typeof EXPERT_REVIEW_STATUSES)[number][] = ['requested', 'in_progress'];

const expertReviewSchema = new Schema(
  {
    reviewId: { type: Types.ObjectId, ref: 'Review', required: true, unique: true },
    contractId: { type: Types.ObjectId, ref: 'Contract', required: true },
    orgId: { type: Types.ObjectId, ref: 'Organization', required: true },
    status: { type: String, enum: EXPERT_REVIEW_STATUSES, required: true },
    attempt: { type: Number, required: true, default: 1 },
    requestedBy: { type: Types.ObjectId, ref: 'User', required: true },
    requestNote: { type: String },
    requestedAt: { type: Date, required: true },
    expertId: { type: Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date },
    completedAt: { type: Date },
    decisionNote: { type: String },
  },
  { timestamps: true },
);

expertReviewSchema.index({ orgId: 1, status: 1, requestedAt: -1 });
expertReviewSchema.index({ contractId: 1, status: 1 });

export type ExpertReview = InferSchemaType<typeof expertReviewSchema>;
export const ExpertReviewModel = model('ExpertReview', expertReviewSchema);
