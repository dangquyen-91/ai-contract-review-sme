import { z } from 'zod';
import {
  LEGAL_SOURCE_CODE_PATTERN,
  LEGAL_SOURCE_STATUSES,
  LEGAL_SOURCE_TYPES,
} from '../models/legalSource.model';

const expectedArticleCount = z.coerce.number().int().min(1).max(5000).optional();

const legalSourceFields = {
  title: z.string().min(2).max(300),
  documentNumber: z.string().trim().max(60),
  sourceType: z.enum(LEGAL_SOURCE_TYPES),
  citationLabel: z.string().min(1).max(100),
  issuingBody: z.string().max(200),
  issuedDate: z.coerce.date(),
  effectiveDate: z.coerce.date(),
  expiryDate: z.coerce.date(),
};

const expiryAfterEffective = (v: { effectiveDate?: Date | null; expiryDate?: Date | null }) =>
  !v.effectiveDate || !v.expiryDate || v.expiryDate > v.effectiveDate;

const expiryAfterEffectiveError = { message: 'expiryDate must be after effectiveDate', path: ['expiryDate'] };

export const createLegalSourceSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toLowerCase()
      .min(2)
      .max(60)
      .regex(LEGAL_SOURCE_CODE_PATTERN, 'Use lowercase letters, digits and underscores, e.g. commercial_law_2005'),
    title: legalSourceFields.title,
    documentNumber: legalSourceFields.documentNumber.optional(),
    sourceType: legalSourceFields.sourceType,
    status: z.enum(LEGAL_SOURCE_STATUSES).default('in_force'),
    citationLabel: legalSourceFields.citationLabel,
    issuingBody: legalSourceFields.issuingBody.optional(),
    issuedDate: legalSourceFields.issuedDate.optional(),
    effectiveDate: legalSourceFields.effectiveDate.optional(),
    expiryDate: legalSourceFields.expiryDate.optional(),
    expectedArticleCount,
  })
  .refine(expiryAfterEffective, expiryAfterEffectiveError);

export const updateLegalSourceSchema = z
  .object({
    title: legalSourceFields.title.optional(),
    documentNumber: legalSourceFields.documentNumber.nullable().optional(),
    sourceType: legalSourceFields.sourceType.optional(),
    status: z.enum(LEGAL_SOURCE_STATUSES).optional(),
    citationLabel: legalSourceFields.citationLabel.optional(),
    issuingBody: legalSourceFields.issuingBody.nullable().optional(),
    issuedDate: z.union([z.null(), legalSourceFields.issuedDate]).optional(),
    effectiveDate: z.union([z.null(), legalSourceFields.effectiveDate]).optional(),
    expiryDate: z.union([z.null(), legalSourceFields.expiryDate]).optional(),
    expectedArticleCount: z.union([z.null(), z.number().int().min(1).max(5000)]).optional(),
  })
  .strict()
  .refine((v) => Object.values(v).some((value) => value !== undefined), 'Provide at least one field to update')
  .refine(expiryAfterEffective, expiryAfterEffectiveError);

export const previewLegalSourceSchema = z.object({ expectedArticleCount });

export const legalSourceIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid legal source id'),
});

export type CreateLegalSourceInput = z.infer<typeof createLegalSourceSchema>;
export type UpdateLegalSourceInput = z.infer<typeof updateLegalSourceSchema>;
export type PreviewLegalSourceInput = z.infer<typeof previewLegalSourceSchema>;
