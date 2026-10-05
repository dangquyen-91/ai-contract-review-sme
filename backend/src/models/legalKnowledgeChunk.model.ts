import { Schema, model, Types, InferSchemaType } from 'mongoose';

export const EMBEDDING_DIMENSIONS = 768;

const legalKnowledgeChunkSchema = new Schema(
  {
    legalSourceId: { type: Types.ObjectId, ref: 'LegalSource', required: true, index: true },
    chunkText: { type: String, required: true },
    articleRef: { type: String },
    embedding: { type: [Number], required: true, select: false },
  },
  { timestamps: true },
);

export type LegalKnowledgeChunk = InferSchemaType<typeof legalKnowledgeChunkSchema>;
export const LegalKnowledgeChunkModel = model('LegalKnowledgeChunk', legalKnowledgeChunkSchema);
