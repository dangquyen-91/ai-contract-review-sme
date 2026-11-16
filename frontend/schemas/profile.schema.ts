import { z } from 'zod';
import { resetPasswordFormSchema } from './auth.schema';

export const profileFormSchema = z.object({
  name: z.string().trim().min(2, 'Họ tên cần ít nhất 2 ký tự.').max(100, 'Họ tên tối đa 100 ký tự.'),
  phone: z.string().trim().max(20, 'Số điện thoại quá dài.').refine(value => value === '' || (/^\+?[0-9][0-9 ()-]{7,19}$/.test(value) && value.replace(/\D/g, '').length >= 8 && value.replace(/\D/g, '').length <= 15), 'Số điện thoại không hợp lệ.'),
});
export const changePasswordFormSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại.').refine(value => new TextEncoder().encode(value).length <= 72, 'Mật khẩu không hợp lệ.'),
  newPassword: resetPasswordFormSchema.shape.password,
  confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu mới.'),
}).refine(input => input.newPassword === input.confirmPassword, { path: ['confirmPassword'], message: 'Mật khẩu nhập lại chưa khớp.' });
