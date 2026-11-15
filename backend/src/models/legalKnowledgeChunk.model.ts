import { Schema, model, Types, InferSchemaType } from 'mongoose';

export const EMBEDDING_DIMENSIONS = 768;

export const LEGAL_HEADING_LEVELS = ['part', 'chapter', 'section', 'subsection'] as const;

const legalHeadingSchema = new Schema(
  {
    level: { type: String, enum: LEGAL_HEADING_LEVELS, required: true },
    number: { type: String, required: true },
    title: { type: String },
  },
  { _id: false },
);

const legalKnowledgeChunkSchema = new Schema(
  {
    legalSourceId: { type: Types.ObjectId, ref: 'LegalSource', required: true, index: true },
    order: { type: Number, required: true },
    chunkText: { type: String, required: true },
    articleRef: { type: String },
    articleNumber: { type: Number },
    articleKey: { type: String },
    articleTitle: { type: String },
    clauseFrom: { type: Number },
    clauseTo: { type: Number },
    hierarchy: { type: [legalHeadingSchema], default: undefined },
    embedding: { type: [Number], default: undefined, select: false },
  },
  { timestamps: true },
);

legalKnowledgeChunkSchema.index({ legalSourceId: 1, order: 1 }, { unique: true });
legalKnowledgeChunkSchema.index({ legalSourceId: 1, articleNumber: 1 });

export type LegalKnowledgeChunk = InferSchemaType<typeof legalKnowledgeChunkSchema>;
export const LegalKnowledgeChunkModel = model('LegalKnowledgeChunk', legalKnowledgeChunkSchema);
