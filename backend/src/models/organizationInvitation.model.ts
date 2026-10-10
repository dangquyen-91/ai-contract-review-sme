import { Schema, model } from 'mongoose';

export const INVITATION_ROLES = ['manager', 'staff', 'reviewer'] as const;

const schema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: INVITATION_ROLES, required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    expiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'revoked', 'expired', 'delivery_failed'],
      default: 'pending',
      required: true,
    },
    acceptedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    acceptedAt: Date,
  },
  { timestamps: true },
);

// Expired pending records are retired before a new invitation is created.
schema.index(
  { orgId: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
  },
);

export const OrganizationInvitationModel = model('OrganizationInvitation', schema);
