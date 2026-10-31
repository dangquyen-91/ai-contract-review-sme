import { z } from 'zod';
import { RISK_CODES, RISK_SEVERITIES } from '../models/riskFinding.model';
import { reviewIdParamSchema } from './review.validation';

const note = z.string().trim().min(1).max(2000);
const points = z.array(z.string().trim().min(1).max(2000)).max(20);

export const verificationFindingParamSchema = reviewIdParamSchema.extend({
  findingId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid finding id'),
});

export const requestVerificationBodySchema = z
  .object({
    note: note.optional(),
    consent: z.literal(true, {
      errorMap: () => ({ message: 'Consent to share the contract with LawScan experts is required' }),
    }),
  })
  .strict();

const findingContent = {
  severity: z.enum(RISK_SEVERITIES).optional(),
  riskCode: z.enum(RISK_CODES).optional(),
  title: z.string().trim().min(1).max(300).optional(),
  problem: points.optional(),
  consequences: points.optional(),
  recommendations: points.optional(),
};

export const decideFindingBodySchema = z
  .object({
    verdict: z.enum(['confirmed', 'adjusted', 'rejected']),
    reason: note.optional(),
    ...findingContent,
  })
  .strict()
  .refine((v) => v.verdict !== 'rejected' || v.reason !== undefined, {
    message: 'A reason is required to reject a finding',
    path: ['reason'],
  })
  .refine(
    (v) =>
      v.verdict !== 'adjusted' ||
      Object.keys(findingContent).some((key) => v[key as keyof typeof findingContent] !== undefined),
    { message: 'Provide at least one field to adjust', path: ['verdict'] },
  )
  .refine(
    (v) =>
      v.verdict === 'adjusted' ||
      Object.keys(findingContent).every((key) => v[key as keyof typeof findingContent] === undefined),
    { message: 'Only an adjusted finding can change its content', path: ['verdict'] },
  );

export const addFindingBodySchema = z
  .object({
    clauseIndex: z.number().int().min(0).optional(),
    severity: z.enum(RISK_SEVERITIES),
    riskCode: z.enum(RISK_CODES),
    title: z.string().trim().min(1).max(300),
    problem: points.min(1),
    consequences: points.default([]),
    recommendations: points.default([]),
    reason: note.optional(),
  })
  .strict();

export const approveVerificationBodySchema = z.object({ decisionNote: note.optional() }).strict().default({});

export const returnVerificationBodySchema = z.object({ reason: note }).strict();

export const verificationQueueQuerySchema = z.object({
  status: z.enum(['requested', 'in_progress', 'all']).optional(),
});

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Invalid calendar date');

export const expertWorkQuerySchema = z.object({
  status: z.enum(['all', 'in_progress', 'approved', 'returned']).default('all'),
  search: z.string().trim().max(100).optional(),
  type: z.string().trim().regex(/^[a-z_]{1,60}$/).optional(),
  from: calendarDate.optional(),
  to: calendarDate.optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
}).refine((value) => !value.from || !value.to || value.from <= value.to, { message: 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.', path: ['to'] });

export const expertWorkspaceQuerySchema = z.object({ attempt: z.coerce.number().int().min(1).max(100000).optional() });
export type ExpertWorkQuery = z.infer<typeof expertWorkQuerySchema>;

export type DecideFindingInput = z.infer<typeof decideFindingBodySchema>;
export type AddFindingInput = z.infer<typeof addFindingBodySchema>;
