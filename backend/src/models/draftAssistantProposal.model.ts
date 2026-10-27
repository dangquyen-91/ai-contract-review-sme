import { Schema, model } from 'mongoose';
import { decryptOnSerialize, encryptedString } from '../utils/fieldEncryption';

const proposalSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    draftId: { type: Schema.Types.ObjectId, ref: 'ContractDraft', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestId: { type: String, required: true },
    baseRevision: { type: Number, required: true },
    userMessage: { type: String, required: true, ...encryptedString },
    selectionJson: { type: String, default: '[]', ...encryptedString },
    referencesJson: { type: String, default: '[]', ...encryptedString },
    assistantMessage: { type: String, required: true, ...encryptedString },
    changesJson: { type: String, required: true, ...encryptedString },
    status: {
      type: String,
      enum: ['pending', 'applied', 'dismissed'],
      default: 'pending',
      required: true,
    },
  },
  { timestamps: true, ...decryptOnSerialize },
);
proposalSchema.index({ draftId: 1, createdBy: 1, requestId: 1 }, { unique: true });
export const DraftAssistantProposalModel = model('DraftAssistantProposal', proposalSchema);
