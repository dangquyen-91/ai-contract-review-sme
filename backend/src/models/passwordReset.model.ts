import { Schema, model } from 'mongoose';

const schema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    challengeHash: { type: String, select: false },
    otpHash: { type: String, select: false },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    authVersion: { type: Number, default: 0 },
    expiresAt: Date,
    lastSentAt: Date,
    windowStartedAt: Date,
    sentCount: { type: Number, default: 0 },
    attempts: { type: Number, default: 0 },
    ready: { type: Boolean, default: false },
    consumed: { type: Boolean, default: false },
    purgeAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true },
);
schema.index({ challengeHash: 1 }, { sparse: true });
export const PasswordResetModel = model('PasswordReset', schema);
