import { Schema, model, Types, InferSchemaType } from 'mongoose';
import { decryptOnSerialize, encryptedString } from '../utils/fieldEncryption';

const clauseSchema = new Schema(
  {
    contractVersionId: { type: Types.ObjectId, ref: 'ContractVersion', required: true, index: true },
    orgId: { type: Types.ObjectId, ref: 'Organization', required: true, index: true },
    index: { type: Number, required: true },
    title: { type: String },
    text: { type: String, required: true, ...encryptedString },
    startOffset: { type: Number, required: true },
    endOffset: { type: Number, required: true },
    clauseTypeId: { type: Types.ObjectId, ref: 'ClauseTypeTaxonomy', required: true, index: true },
    summary: { type: String, required: true },
  },
  { timestamps: true, ...decryptOnSerialize },
);

clauseSchema.index({ contractVersionId: 1, index: 1 });
clauseSchema.index({ orgId: 1, clauseTypeId: 1 });

export type Clause = InferSchemaType<typeof clauseSchema>;
export const ClauseModel = model('Clause', clauseSchema);
