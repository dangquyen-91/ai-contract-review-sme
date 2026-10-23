import { z } from 'zod';
import { ROLE_CODES } from '../models/role.model';
import { registerSchema } from './auth.validation';

export const userIdParams = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) });
export const listUsersQuery = z.object({
  search: z.string().trim().max(100).default(''),
  role: z.enum(ROLE_CODES).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
const fields = z.object({
  name: z.string().trim().min(2).max(100),
  email: registerSchema.shape.email,
  role: z.enum(ROLE_CODES),
  isActive: z.boolean(),
});
export const createUserBody = fields
  .extend({
    password: registerSchema.shape.password,
    role: z.enum(['user', 'administrator']).default('user'),
    isActive: z.boolean().default(true),
  })
  .strict();
export const updateUserBody = fields
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field');
