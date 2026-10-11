import { z } from 'zod';
import { invitationTokenSchema } from './invitation.validation';

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  invitationToken: invitationTokenSchema.optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
  remember: z.boolean().optional(),
  invitationToken: invitationTokenSchema.optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
  invitationToken: invitationTokenSchema.optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
