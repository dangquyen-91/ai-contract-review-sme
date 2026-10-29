import { Schema, model } from 'mongoose';
import { decryptOnSerialize, encryptedString } from '../utils/fieldEncryption';

const schema = new Schema({
  orgId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  templateCode: { type: String, enum: ['labor', 'service', 'sales', 'rental'], required: true },
  templateVersion: { type: Number, required: true },
  templateJson: { type: String, required: true, immutable: true },
  ourParty: { type: String, required: true },
  inputJson: { type: String, required: true, ...encryptedString },
  organizationJson: { type: String, required: true, ...encryptedString },
  content: { type: String, default: '', ...encryptedString },
  documentJson: { type: String, default: '', ...encryptedString },
  status: { type: String, enum: ['draft', 'pending_approval', 'approved'], default: 'draft', required: true },
  revision: { type: Number, default: 0, required: true },
  pinnedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  generatedAt: Date,
  generatedByModel: String,
  notes: { type: String, default: '[]', ...encryptedString },
  decisionNote: { type: String, default: '', ...encryptedString },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  generationToken: { type: String, select: false },
  generationStartedAt: Date,
  contractId: { type: Schema.Types.ObjectId, ref: 'Contract' },
}, { timestamps: true, ...decryptOnSerialize });
schema.index({ orgId: 1, createdBy: 1, updatedAt: -1 });
schema.index({ orgId: 1, deletedAt: 1, pinnedAt: -1, updatedAt: -1, _id: -1 });
schema.index({ orgId: 1, createdBy: 1, deletedAt: 1, pinnedAt: -1, updatedAt: -1, _id: -1 });
export const ContractDraftModel = model('ContractDraft', schema);
