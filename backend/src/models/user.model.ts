import { Schema, model, InferSchemaType } from 'mongoose';

export const PLATFORM_ROLES = ['administrator', 'manager', 'expert'] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

const userSchema = new Schema(
  {
    platformRole: { type: String, enum: PLATFORM_ROLES, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    avatarUrl: String,
    avatarPublicId: { type: String, select: false },
    hasPassword: Boolean,
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    hasCompletedOnboarding: { type: Boolean, default: false },
    permissionsVersion: { type: Number, default: 0 },
    authVersion: { type: Number, default: 0 },
    emailVerifiedAt: { type: Date, default: null },
    googleSubject: { type: String, unique: true, sparse: true, select: false },
  },
  { timestamps: true },
);

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model('User', userSchema);
