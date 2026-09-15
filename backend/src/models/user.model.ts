import { Schema, model, Types, InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    orgId: { type: Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['administrator', 'manager', 'staff'],
      default: 'staff',
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model('User', userSchema);
