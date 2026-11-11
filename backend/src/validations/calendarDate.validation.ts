import { z } from 'zod';

// Check the civil date before Date parses and normalizes it (e.g. February 30).
export const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Ngày không tồn tại.');

export const legalDateSchema = z.union([
  z.date(),
  calendarDateSchema.transform((value) => new Date(`${value}T00:00:00.000Z`)),
  z
    .string()
    .datetime({ offset: true })
    .refine(
      (value) => calendarDateSchema.safeParse(value.slice(0, 10)).success,
      'Ngày không tồn tại.',
    )
    .transform((value) => new Date(value)),
]);
