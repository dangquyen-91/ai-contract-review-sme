import { Schema, model, InferSchemaType } from 'mongoose';

export const LEGAL_SOURCE_TYPES = ['law', 'standard_template'] as const;

const legalSourceSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    sourceType: { type: String, enum: LEGAL_SOURCE_TYPES, required: true, index: true },
    issuingBody: { type: String },
    citationLabel: { type: String, required: true },
    effectiveDate: { type: Date },
  },
  { timestamps: true },
);

export type LegalSource = InferSchemaType<typeof legalSourceSchema>;
export const LegalSourceModel = model('LegalSource', legalSourceSchema);
