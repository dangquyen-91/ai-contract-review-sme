import { Schema, model, Types } from 'mongoose';
import { encryptedString, decryptOnSerialize } from '../utils/fieldEncryption';

// Immutable record of a completed attempt. Reopening an ExpertReview must not
// erase the previous expert's work or expose a newer attempt in its place.
const schema = new Schema({
  expertReviewId: { type: Types.ObjectId, ref: 'ExpertReview', required: true },
  reviewId: { type: Types.ObjectId, ref: 'Review', required: true },
  contractId: { type: Types.ObjectId, ref: 'Contract', required: true },
  expertId: { type: Types.ObjectId, ref: 'User', required: true },
  requestedBy: { type: Types.ObjectId, ref: 'User', required: true },
  attempt: { type: Number, required: true },
  status: { type: String, enum: ['approved', 'returned'], required: true },
  title: { type: String, required: true },
  contractType: String,
  requestedAt: Date,
  assignedAt: Date,
  completedAt: { type: Date, required: true },
  workspaceJson: { type: String, required: true, select: false, ...encryptedString },
}, { timestamps: true, ...decryptOnSerialize });

schema.index({ expertReviewId: 1, attempt: 1 }, { unique: true });
schema.index({ expertId: 1, status: 1, assignedAt: -1 });
export const ExpertWorkRecordModel = model('ExpertWorkRecord', schema);
