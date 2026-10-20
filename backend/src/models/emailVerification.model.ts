import { Schema, model } from 'mongoose';

const schema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    challengeHash: { type: String, select: false },
    otpHash: { type: String, select: false },
    name: String,
    passwordHash: { type: String, select: false },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    invitationHash: { type: String, select: false },
    remember: { type: Boolean, default: false },
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
export const EmailVerificationModel = model('EmailVerification', schema);
