import { Schema, model, InferSchemaType } from 'mongoose';

export const ROLE_CODES = ['administrator', 'manager', 'staff'] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

const roleSchema = new Schema(
  {
    code: { type: String, enum: ROLE_CODES, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    isSystemRole: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type Role = InferSchemaType<typeof roleSchema>;
export const RoleModel = model('Role', roleSchema);
