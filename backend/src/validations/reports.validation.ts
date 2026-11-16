import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const reportQuerySchema = z
  .object({
    days: z.coerce.number().int().min(1).max(90).optional(),
    period: z.enum(['week', 'month', 'quarter', 'year', 'custom']).optional(),
    comparison: z.enum(['none', 'previous', 'year']).default('previous'),
    granularity: z.enum(['auto', 'day', 'week', 'month']).default('auto'),
    anchor: date.optional(),
    start: date.optional(),
    end: date.optional(),
    organizationId: z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.days !== undefined && (value.period || value.anchor || value.start || value.end))
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Không kết hợp days với kỳ lịch.' });
    if (value.period === 'custom' && (!value.start || !value.end))
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Hãy chọn ngày bắt đầu và kết thúc.',
      });
    if (value.period !== 'custom' && (value.start || value.end))
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Khoảng ngày chỉ dùng cho kỳ tùy chọn.',
      });
  });
