import { Schema, model, Types, InferSchemaType } from 'mongoose';

const riskCitationSchema = new Schema(
  {
    riskFindingId: { type: Types.ObjectId, ref: 'RiskFinding', required: true, index: true },
    legalKnowledgeChunkId: {
      type: Types.ObjectId,
      ref: 'LegalKnowledgeChunk',
      required: true,
    },
    relevanceScore: { type: Number, required: true },
  },
  { timestamps: true },
);

export type RiskCitation = InferSchemaType<typeof riskCitationSchema>;
export const RiskCitationModel = model('RiskCitation', riskCitationSchema);
