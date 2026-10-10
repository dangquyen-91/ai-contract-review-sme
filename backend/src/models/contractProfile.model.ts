import { Schema, model, InferSchemaType } from 'mongoose';
import { CLAUSE_CATEGORIES } from './clauseTypeTaxonomy.model';

export const PROFILE_SEGMENTS = ['business', 'individual', 'both'] as const;

export const SENSITIVE_DATA_TYPES = [
  'person_name',
  'national_id',
  'passport',
  'date_of_birth',
  'phone',
  'email',
  'bank_account',
  'personal_address',
  'tax_code',
  'land_certificate',
] as const;

const partySchema = new Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false },
);

const industryRuleSchema = new Schema(
  {
    industry: { type: String, required: true },
    checks: { type: [String], default: [] },
    extraMandatoryClauses: { type: [String], enum: CLAUSE_CATEGORIES, default: [] },
  },
  { _id: false },
);

const contractProfileSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    aliases: { type: [String], default: [], index: true },
    name: { type: String, required: true },
    promptLabel: { type: String, required: true },
    segment: { type: String, enum: PROFILE_SEGMENTS, required: true },
    parties: { type: [partySchema], default: [] },
    governingLaws: { type: [String], default: [] },
    clauseCategories: { type: [String], enum: CLAUSE_CATEGORIES, default: [] },
    mandatoryClauses: { type: [String], enum: CLAUSE_CATEGORIES, default: [] },
    industryRules: { type: [industryRuleSchema], default: [] },
    redactionPolicy: { type: [String], enum: SENSITIVE_DATA_TYPES, default: [] },
  },
  { timestamps: true },
);

export type ContractProfile = InferSchemaType<typeof contractProfileSchema>;
export const ContractProfileModel = model('ContractProfile', contractProfileSchema);
