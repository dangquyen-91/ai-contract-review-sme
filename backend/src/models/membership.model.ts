import { Schema, model, InferSchemaType } from 'mongoose';

export const MEMBERSHIP_ROLES = ['owner', 'staff'] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

const membershipSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    role: { type: String, enum: MEMBERSHIP_ROLES, required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true },
);

membershipSchema.index(
  { orgId: 1, role: 1 },
  { unique: true, partialFilterExpression: { role: 'owner' } },
);

export type Membership = InferSchemaType<typeof membershipSchema>;
export const MembershipModel = model('Membership', membershipSchema);
