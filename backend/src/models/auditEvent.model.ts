import { Schema, model, InferSchemaType } from 'mongoose';

/** Sensitive administrative actions, grouped by the area they change. */
export const AUDIT_ACTIONS = [
  // Administrator: accounts
  'user.create',
  'user.update',
  'user.delete',
  // Manager: contract templates and legal sources
  'template.create',
  'template.publish',
  'template.retire',
  'template.delete',
  'legal_source.create',
  'legal_source.update',
  'legal_source.delete',
  'legal_source.reparse',
  'legal_source.replace',
  // Owner: organization, members and plan
  'invitation.create',
  'invitation.revoke',
  'member.remove',
  'organization.delete',
  'subscription.schedule_downgrade',
  'subscription.cancel_downgrade',
  // Payments settled by payOS
  'payment.fulfilled',
  'payment.activation_failed',
  // Account security
  'account.password_change',
  // Administrator: AI operations
  'ai_job.cancel',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export const AUDIT_GROUPS = ['user', 'template', 'legal_source', 'invitation', 'member', 'organization', 'subscription', 'payment', 'account', 'ai_job'] as const;

const schema = new Schema(
  {
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    // Who did it; `system` for events without a signed-in person, such as a payOS webhook.
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorRole: { type: String, required: true },
    target: {
      type: { type: String, required: true },
      id: { type: String, default: null },
      label: { type: String, default: null },
    },
    orgId: { type: Schema.Types.ObjectId, default: null },
    // Only the changed fields that matter for review; never secrets or document text.
    changes: { type: Schema.Types.Mixed, default: undefined },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
schema.index({ createdAt: -1, _id: -1 });
schema.index({ action: 1, createdAt: -1 });
schema.index({ actorId: 1, createdAt: -1 });

export type AuditEvent = InferSchemaType<typeof schema>;
export const AuditEventModel = model('AuditEvent', schema);
