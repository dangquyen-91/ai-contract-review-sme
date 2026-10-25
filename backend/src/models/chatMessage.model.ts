import { Schema, model, Types, InferSchemaType } from 'mongoose';
import { decryptOnSerialize, encryptedString } from '../utils/fieldEncryption';

export const CHAT_ROLES = ['user', 'assistant'] as const;

const chatLegalSourceSchema = new Schema(
  {
    legalKnowledgeChunkId: { type: Types.ObjectId, ref: 'LegalKnowledgeChunk', required: true },
    citationLabel: { type: String, required: true },
    sourceTitle: { type: String, required: true },
    articleRef: { type: String },
  },
  { _id: false },
);

const chatMessageSchema = new Schema(
  {
    contractVersionId: {
      type: Types.ObjectId,
      ref: 'ContractVersion',
      required: true,
      index: true,
    },
    orgId: { type: Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: CHAT_ROLES, required: true },
    content: { type: String, required: true, ...encryptedString },
    legalSources: { type: [chatLegalSourceSchema], default: undefined },
  },
  { timestamps: true, ...decryptOnSerialize },
);

chatMessageSchema.index({ contractVersionId: 1, createdAt: 1 });

export type ChatMessage = InferSchemaType<typeof chatMessageSchema>;
export const ChatMessageModel = model('ChatMessage', chatMessageSchema);
