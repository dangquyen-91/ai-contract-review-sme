import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const reportQuerySchema = z
  .object({
    days: z.coerce.number().int().min(1).max(90).optional(),
    period: z.enum(["week", "month", "quarter", "year", "custom"]).optional(),
    comparison: z.enum(["none", "previous", "year"]).optional(),
    granularity: z.enum(["auto", "day", "week", "month"]).optional(),
    anchor: date.optional(),
    start: date.optional(),
    end: date.optional(),
    organizationId: z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .optional(),
  })
  .refine(
    (value) =>
      !(
        value.days !== undefined &&
        (value.period || value.anchor || value.start || value.end)
      ),
  )
  .refine(
    (value) => value.period !== "custom" || Boolean(value.start && value.end),
  )
  .refine((value) => value.period === "custom" || (!value.start && !value.end));
