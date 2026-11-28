import { z } from 'zod';
import { REVIEW_ERROR_CODES, REVIEW_STATUSES } from '../models/review.model';
import { AUDIT_GROUPS } from '../models/auditEvent.model';

const page = z.coerce.number().int().min(1).max(100000).default(1);
const limit = z.coerce.number().int().min(1).max(100).default(20);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const aiJobListSchema = z.object({
  page,
  limit,
  status: z.enum([...REVIEW_STATUSES, 'stuck']).or(z.literal('')).default(''),
  errorCode: z.enum(REVIEW_ERROR_CODES).or(z.literal('')).default(''),
  search: z.string().trim().max(100).default(''),
});
export const aiJobParamsSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) });

export const auditListSchema = z
  .object({
    page,
    limit,
    group: z.enum(AUDIT_GROUPS).or(z.literal('')).default(''),
    search: z.string().trim().max(100).default(''),
    // Calendar days in Vietnam time, inclusive.
    from: day.optional(),
    to: day.optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: 'Ngày bắt đầu phải trước ngày kết thúc.',
    path: ['to'],
  });
