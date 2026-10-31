import { z } from 'zod';
import { RISK_CODES, RISK_SEVERITIES } from '../models/riskFinding.model';
import { reviewIdParamSchema } from './review.validation';

const note = z.string().trim().min(1).max(2000);
const points = z.array(z.string().trim().min(1).max(2000)).max(20);

export const verificationFindingParamSchema = reviewIdParamSchema.extend({
  findingId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid finding id'),
});

export const requestVerificationBodySchema = z.object({ note: note.optional() }).strict().default({});

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

export type DecideFindingInput = z.infer<typeof decideFindingBodySchema>;
export type AddFindingInput = z.infer<typeof addFindingBodySchema>;
