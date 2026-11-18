import { Schema, model, Types, InferSchemaType } from 'mongoose';
import { decryptOnSerialize, encryptedString } from '../utils/fieldEncryption';

const schema = new Schema(
  {
    expertReviewId: { type: Types.ObjectId, ref: 'ExpertReview', required: true },
    contractId: { type: Types.ObjectId, ref: 'Contract', required: true },
    attempt: { type: Number, required: true },
    sequence: { type: Number, required: true },
    senderId: { type: Types.ObjectId, ref: 'User', required: true },
    senderType: { type: String, enum: ['requester', 'expert'], required: true },
    clientMessageId: { type: String, required: true },
    content: { type: String, required: true, ...encryptedString },
  },
  { timestamps: true, ...decryptOnSerialize },
);

schema.index({ expertReviewId: 1, attempt: 1, sequence: 1 }, { unique: true });
schema.index({ expertReviewId: 1, attempt: 1, senderId: 1, clientMessageId: 1 }, { unique: true });
schema.index({ contractId: 1 });

export type ExpertChatMessage = InferSchemaType<typeof schema>;
export const ExpertChatMessageModel = model('ExpertChatMessage', schema);
