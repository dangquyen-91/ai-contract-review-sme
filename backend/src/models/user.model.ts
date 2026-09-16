import { Schema, model, Types, InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    orgId: { type: Types.ObjectId, ref: 'Organization', required: true, index: true },
    roleId: { type: Types.ObjectId, ref: 'Role', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model('User', userSchema);
