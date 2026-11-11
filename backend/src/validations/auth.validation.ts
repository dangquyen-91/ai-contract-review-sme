import { z } from 'zod';
import { invitationTokenSchema } from './invitation.validation';

const commonPasswords = new Set([
  '123456789012',
  'password1234',
  'admin12345678',
  'qwerty123456',
  'lawscan123456',
]);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).toLowerCase(),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must not exceed 72 bytes')
    .refine(
      (value) => !commonPasswords.has(value.toLowerCase()),
      'Mật khẩu này quá phổ biến. Hãy chọn mật khẩu khác.',
    ),
  invitationToken: invitationTokenSchema.optional(),
});

export const loginSchema = z.object({
  email: registerSchema.shape.email,
  password: z
    .string()
    .min(1)
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must not exceed 72 bytes'),
  remember: z.boolean().optional(),
  invitationToken: invitationTokenSchema.optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
  invitationToken: invitationTokenSchema.optional(),
  workspace: z.enum(['personal', 'organization']).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export const googleLoginSchema = z.object({
  credential: z.string().min(1).max(10000),
  nonce: z.string().regex(/^[a-f0-9]{64}$/),
  remember: z.boolean().optional(),
  invitationToken: invitationTokenSchema.optional(),
});
export const resendVerificationSchema = z.object({
  challengeId: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid verification request'),
  invitationToken: invitationTokenSchema.optional(),
});
export const verifyEmailSchema = resendVerificationSchema.extend({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit verification code'),
});
export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254).toLowerCase(),
});
export const resetPasswordSchema = z.object({
  challengeId: z.string().regex(/^[a-f0-9]{64}$/),
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit verification code'),
  password: registerSchema.shape.password,
});
