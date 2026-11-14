import { z } from 'zod';
import { legalDateSchema } from './calendarDate.validation';
import {
  LEGAL_SOURCE_CODE_PATTERN,
  LEGAL_SOURCE_PUBLISHERS,
  LEGAL_SOURCE_STATUSES,
  LEGAL_SOURCE_TYPES,
  LEGAL_TEXT_KINDS,
} from '../models/legalSource.model';

const expectedArticleCount = z.coerce.number().int().min(1).max(5000).optional();

const MAX_CONSOLIDATED_DOCUMENTS = 30;

const httpUrlSchema = z
  .string()
  .trim()
  .max(500)
  .url()
  .refine((value) => /^https?:\/\//i.test(value), 'Use an http or https link');

const originSchema = z
  .object({
    publisher: z.enum(LEGAL_SOURCE_PUBLISHERS),
    url: httpUrlSchema.optional(),
    retrievedAt: legalDateSchema.optional(),
  })
  .strict()
  .refine((origin) => !origin.retrievedAt || origin.retrievedAt <= new Date(), {
    message: 'retrievedAt cannot be in the future',
    path: ['retrievedAt'],
  });

const documentNumberSchema = z.string().trim().min(1).max(60);

const consolidatedThroughSchema = z
  .array(documentNumberSchema)
  .min(1)
  .max(MAX_CONSOLIDATED_DOCUMENTS)
  .refine((numbers) => new Set(numbers).size === numbers.length, 'consolidatedThrough has duplicate entries');

function parseFormJson(value: unknown) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function parseFormList(value: unknown) {
  const parsed = parseFormJson(value);
  if (typeof parsed !== 'string') return parsed;
  const items = parsed
    .split(/[\n,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

const legalSourceFields = {
  title: z.string().trim().min(2).max(300),
  documentNumber: z.string().trim().max(60),
  sourceType: z.enum(LEGAL_SOURCE_TYPES),
  citationLabel: z.string().trim().min(1).max(100),
  issuingBody: z.string().max(200),
  signer: z.string().trim().min(1).max(100),
  legalField: z.string().trim().min(1).max(100),
  issuingPlace: z.string().trim().min(1).max(100),
  gazette: z.string().trim().min(1).max(200),
  textKind: z.enum(LEGAL_TEXT_KINDS),
  issuedDate: legalDateSchema,
  effectiveDate: legalDateSchema,
  expiryDate: legalDateSchema,
};

const expiryAfterEffective = (v: { effectiveDate?: Date | null; expiryDate?: Date | null }) =>
  !v.effectiveDate || !v.expiryDate || v.expiryDate > v.effectiveDate;

const expiryAfterEffectiveError = {
  message: 'expiryDate must be after effectiveDate',
  path: ['expiryDate'],
};

export const CONSOLIDATED_ONLY_MESSAGE = 'consolidatedThrough requires textKind "consolidated"';

export const createLegalSourceSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toLowerCase()
      .min(2)
      .max(60)
      .regex(
        LEGAL_SOURCE_CODE_PATTERN,
        'Use lowercase letters, digits and underscores, e.g. commercial_law_2005',
      ),
    title: legalSourceFields.title,
    documentNumber: legalSourceFields.documentNumber.optional(),
    sourceType: legalSourceFields.sourceType,
    status: z.enum(LEGAL_SOURCE_STATUSES).default('in_force'),
    citationLabel: legalSourceFields.citationLabel,
    issuingBody: legalSourceFields.issuingBody.optional(),
    signer: legalSourceFields.signer.optional(),
    legalField: legalSourceFields.legalField.optional(),
    issuingPlace: legalSourceFields.issuingPlace.optional(),
    gazette: legalSourceFields.gazette.optional(),
    origin: z.preprocess(parseFormJson, originSchema.optional()),
    textKind: legalSourceFields.textKind.optional(),
    consolidatedThrough: z.preprocess(parseFormList, consolidatedThroughSchema.optional()),
    issuedDate: legalSourceFields.issuedDate.optional(),
    effectiveDate: legalSourceFields.effectiveDate.optional(),
    expiryDate: legalSourceFields.expiryDate.optional(),
    expectedArticleCount,
  })
  .refine(expiryAfterEffective, expiryAfterEffectiveError)
  .refine((v) => !v.consolidatedThrough || v.textKind === 'consolidated', {
    message: CONSOLIDATED_ONLY_MESSAGE,
    path: ['consolidatedThrough'],
  });

export const updateLegalSourceSchema = z
  .object({
    title: legalSourceFields.title.optional(),
    documentNumber: legalSourceFields.documentNumber.nullable().optional(),
    sourceType: legalSourceFields.sourceType.optional(),
    status: z.enum(LEGAL_SOURCE_STATUSES).optional(),
    citationLabel: legalSourceFields.citationLabel.optional(),
    issuingBody: legalSourceFields.issuingBody.nullable().optional(),
    signer: legalSourceFields.signer.nullable().optional(),
    legalField: legalSourceFields.legalField.nullable().optional(),
    issuingPlace: legalSourceFields.issuingPlace.nullable().optional(),
    gazette: legalSourceFields.gazette.nullable().optional(),
    origin: originSchema.nullable().optional(),
    textKind: legalSourceFields.textKind.nullable().optional(),
    consolidatedThrough: consolidatedThroughSchema.nullable().optional(),
    issuedDate: z.union([z.null(), legalSourceFields.issuedDate]).optional(),
    effectiveDate: z.union([z.null(), legalSourceFields.effectiveDate]).optional(),
    expiryDate: z.union([z.null(), legalSourceFields.expiryDate]).optional(),
    expectedArticleCount: z.union([z.null(), z.number().int().min(1).max(5000)]).optional(),
  })
  .strict()
  .refine(
    (v) => Object.values(v).some((value) => value !== undefined),
    'Provide at least one field to update',
  )
  .refine(expiryAfterEffective, expiryAfterEffectiveError);

export const previewLegalSourceSchema = z.object({ expectedArticleCount });

export const replaceLegalSourceContentSchema = z.object({
  expectedArticleCount,
  origin: z.preprocess(parseFormJson, originSchema.optional()),
  textKind: legalSourceFields.textKind.optional(),
  consolidatedThrough: z.preprocess(parseFormList, consolidatedThroughSchema.optional()),
});

export const legalSourceIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid legal source id'),
});

export const legalSourcePartParamSchema = legalSourceIdParamSchema.extend({
  partIndex: z.coerce.number().int().min(0).max(999),
});

export type CreateLegalSourceInput = z.infer<typeof createLegalSourceSchema>;
export type UpdateLegalSourceInput = z.infer<typeof updateLegalSourceSchema>;
export type PreviewLegalSourceInput = z.infer<typeof previewLegalSourceSchema>;
export type ReplaceLegalSourceContentInput = z.infer<typeof replaceLegalSourceContentSchema>;
