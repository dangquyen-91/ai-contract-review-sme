import { z } from "zod";

const commonPasswords = new Set([
  "123456789012",
  "password1234",
  "admin12345678",
  "qwerty123456",
  "lawscan123456",
]);

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Vui lòng nhập email công việc.")
  .max(254, "Email quá dài.")
  .email("Email chưa đúng định dạng.");

const password = z
  .string()
  .min(12, "Mật khẩu cần ít nhất 12 ký tự.")
  .refine((value) => new TextEncoder().encode(value).length <= 72, "Mật khẩu không được vượt quá 72 byte.")
  .refine((value) => !commonPasswords.has(value.toLowerCase()), "Mật khẩu này quá phổ biến. Hãy chọn mật khẩu khác.");

export const registerFormSchema = z
  .object({
    orgName: z.string().trim().min(2, "Tên doanh nghiệp cần ít nhất 2 ký tự.").max(200, "Tên doanh nghiệp quá dài."),
    name: z.string().trim().min(2, "Họ và tên cần ít nhất 2 ký tự.").max(100, "Họ và tên quá dài."),
    email,
    password,
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu."),
  })
  .superRefine((data, context) => {
    if (data.password !== data.confirmPassword) {
      context.addIssue({ code: "custom", path: ["confirmPassword"], message: "Mật khẩu nhập lại chưa khớp." });
    }
  });

export const loginFormSchema = z.object({
  email,
  password: z.string().min(1, "Vui lòng nhập mật khẩu.").refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "Mật khẩu không hợp lệ.",
  ),
  remember: z.boolean(),
});
