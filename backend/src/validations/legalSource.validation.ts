import { z } from 'zod';
import {
  LEGAL_SOURCE_CODE_PATTERN,
  LEGAL_SOURCE_STATUSES,
  LEGAL_SOURCE_TYPES,
} from '../models/legalSource.model';

const expectedArticleCount = z.coerce.number().int().min(1).max(5000).optional();

export const createLegalSourceSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toLowerCase()
      .min(2)
      .max(60)
      .regex(LEGAL_SOURCE_CODE_PATTERN, 'Use lowercase letters, digits and underscores, e.g. commercial_law_2005'),
    title: z.string().min(2).max(300),
    documentNumber: z.string().trim().max(60).optional(),
    sourceType: z.enum(LEGAL_SOURCE_TYPES),
    status: z.enum(LEGAL_SOURCE_STATUSES).default('in_force'),
    citationLabel: z.string().min(1).max(100),
    issuingBody: z.string().max(200).optional(),
    issuedDate: z.coerce.date().optional(),
    effectiveDate: z.coerce.date().optional(),
    expiryDate: z.coerce.date().optional(),
    expectedArticleCount,
  })
  .refine((v) => !v.effectiveDate || !v.expiryDate || v.expiryDate > v.effectiveDate, {
    message: 'expiryDate must be after effectiveDate',
    path: ['expiryDate'],
  });

export const previewLegalSourceSchema = z.object({ expectedArticleCount });

export const legalSourceIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid legal source id'),
});

export type CreateLegalSourceInput = z.infer<typeof createLegalSourceSchema>;
export type PreviewLegalSourceInput = z.infer<typeof previewLegalSourceSchema>;
