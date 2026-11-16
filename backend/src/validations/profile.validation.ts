import { z } from 'zod';
import { registerSchema } from './auth.validation';

export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(2, 'Họ tên cần ít nhất 2 ký tự.').max(100),
    phone: z
      .string()
      .trim()
      .max(20)
      .refine(
        (value) =>
          value === '' ||
          (/^\+?[0-9][0-9 ()-]{7,19}$/.test(value) &&
            value.replace(/\D/g, '').length >= 8 &&
            value.replace(/\D/g, '').length <= 15),
        'Số điện thoại không hợp lệ.',
      )
      .default(''),
  })
  .strict();
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1)
      .refine((value) => Buffer.byteLength(value, 'utf8') <= 72),
    newPassword: registerSchema.shape.password,
  })
  .strict();
