import { z } from 'zod';
import { PLAN_CODES } from '../models/subscription.model';
import { AppError } from '../errors/AppError';
import { Request } from 'express';

export const downgradeSchema = z.object({ planCode: z.enum(PLAN_CODES) });

export function getIdempotencyKey(req: Request) {
  const key = req.get('Idempotency-Key');
  if (!key || !/^[a-zA-Z0-9_-]{8,128}$/.test(key)) {
    throw AppError.badRequest('Idempotency-Key header is required (8-128 letters, digits, _ or -)');
  }
  return key;
}
