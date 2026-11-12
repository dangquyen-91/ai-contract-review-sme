import { z } from 'zod';

export const studioLawIdsSchema = z
  .array(
    z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .transform((id) => id.toLowerCase()),
  )
  .max(10, 'Chỉ chọn tối đa 10 văn bản.')
  .refine((ids) => new Set(ids).size === ids.length, 'Văn bản được chọn không được trùng.');
export const studioLawQuerySchema = z.object({
  q: z.string().trim().max(100).default(''),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  templateCode: z.enum(['labor', 'service', 'sales', 'rental']).optional(),
  ids: z
    .string()
    .max(249)
    .optional()
    .transform((value) => (value ? value.split(',') : undefined))
    .pipe(studioLawIdsSchema.optional()),
});

export const assistantRequestSchema = z
  .object({
    revision: z.number().int().min(0),
    requestId: z.string().regex(/^[\w-]{8,100}$/),
    message: z.string().trim().min(2).max(5000),
    mode: z.enum(['edit', 'check']).default('edit'),
    legalSourceIds: studioLawIdsSchema.default([]),
    references: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(150),
            text: z.string().trim().min(1).max(12000),
          })
          .strict(),
      )
      .max(3)
      .default([]),
    blockIds: z
      .array(z.string().regex(/^[\w-]{1,80}$/))
      .max(20)
      .default([]),
  })
  .strict()
  .refine(
    (input) => input.references.reduce((sum, item) => sum + item.text.length, 0) <= 24000,
    'Tài liệu đính kèm vượt quá 24.000 ký tự.',
  );
export const proposalActionSchema = z
  .object({ revision: z.number().int().min(0), action: z.enum(['apply', 'dismiss']) })
  .strict();
