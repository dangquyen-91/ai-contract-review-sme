import { z } from 'zod';
import { PLAN_CODES } from '../models/subscription.model';
import { PAYMENT_ACTIONS } from '../models/payment.model';

export const createPaymentSchema = z
  .object({
    planCode: z.enum(PLAN_CODES),
    action: z.enum(PAYMENT_ACTIONS),
  })
  .strict();
export const paymentParamsSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid organization id'),
  orderCode: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});
export const paymentListSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
