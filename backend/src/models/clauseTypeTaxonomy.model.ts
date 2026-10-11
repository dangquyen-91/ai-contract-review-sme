import { Schema, model, InferSchemaType } from 'mongoose';

export const CLAUSE_CATEGORIES = [
  'subject_scope',
  'payment',
  'deposit',
  'term',
  'delivery_handover',
  'service_level',
  'warranty',
  'property_legal_status',
  'ownership_transfer',
  'maintenance_repair',
  'sublease_transfer',
  'probation',
  'wages',
  'working_time',
  'social_insurance',
  'insurance_benefits',
  'insurance_exclusions',
  'claims',
  'surrender_value',
  'confidentiality',
  'data_protection',
  'intellectual_property',
  'penalty',
  'indemnity',
  'liability',
  'renewal',
  'termination',
  'force_majeure',
  'dispute_resolution',
  'other',
] as const;

export type ClauseCategory = (typeof CLAUSE_CATEGORIES)[number];

const clauseTypeTaxonomySchema = new Schema(
  {
    code: { type: String, enum: CLAUSE_CATEGORIES, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
  },
  { timestamps: true },
);

export type ClauseTypeTaxonomy = InferSchemaType<typeof clauseTypeTaxonomySchema>;
export const ClauseTypeTaxonomyModel = model('ClauseTypeTaxonomy', clauseTypeTaxonomySchema);
