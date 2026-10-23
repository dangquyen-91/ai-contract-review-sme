import { Schema, model, Types, InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    orgId: { type: Types.ObjectId, ref: 'Organization', index: true },
    roleId: { type: Types.ObjectId, ref: 'Role', required: true, index: true },
    name: { type: String, required: true, trim: true },
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
