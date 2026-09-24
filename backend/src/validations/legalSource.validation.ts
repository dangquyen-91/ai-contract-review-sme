import { z } from 'zod';
import { LEGAL_SOURCE_TYPES } from '../models/legalSource.model';

export const createLegalSourceSchema = z.object({
  title: z.string().min(2).max(300),
  sourceType: z.enum(LEGAL_SOURCE_TYPES),
  citationLabel: z.string().min(1).max(100),
  issuingBody: z.string().max(200).optional(),
  effectiveDate: z.coerce.date().optional(),
});

export const legalSourceIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid legal source id'),
});

export type CreateLegalSourceInput = z.infer<typeof createLegalSourceSchema>;
