import { Schema, model, InferSchemaType } from 'mongoose';
import { CONTRACT_TYPES } from './contract.model';

export const CLAUSE_CATEGORIES = [
  'payment',
  'confidentiality',
  'termination',
  'penalty',
  'indemnity',
  'intellectual_property',
  'dispute_resolution',
  'liability',
  'force_majeure',
  'renewal',
  'warranty',
  'other',
] as const;

const clauseTypeTaxonomySchema = new Schema(
  {
    code: { type: String, enum: CLAUSE_CATEGORIES, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    applicableContractTypes: { type: [String], enum: CONTRACT_TYPES, default: [] },
    isMandatory: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type ClauseTypeTaxonomy = InferSchemaType<typeof clauseTypeTaxonomySchema>;
export const ClauseTypeTaxonomyModel = model('ClauseTypeTaxonomy', clauseTypeTaxonomySchema);
