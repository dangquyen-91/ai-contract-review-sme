import { Schema, model, Types, InferSchemaType } from 'mongoose';

export const LEGAL_SOURCE_EVENT_ACTIONS = [
  'created',
  'part_appended',
  'updated',
  'status_changed',
  'ingestion_resumed',
  'reparsed',
  'content_replaced',
  'deleted',
] as const;

const legalSourceEventSchema = new Schema(
  {
    legalSourceId: { type: Types.ObjectId, ref: 'LegalSource', required: true },
    code: { type: String, required: true },
    title: { type: String, required: true },
    action: { type: String, enum: LEGAL_SOURCE_EVENT_ACTIONS, required: true },
    actorId: { type: Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: undefined },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

legalSourceEventSchema.index({ legalSourceId: 1, createdAt: -1 });
legalSourceEventSchema.index({ actorId: 1, createdAt: -1 });

export type LegalSourceEvent = InferSchemaType<typeof legalSourceEventSchema>;
export const LegalSourceEventModel = model('LegalSourceEvent', legalSourceEventSchema);
