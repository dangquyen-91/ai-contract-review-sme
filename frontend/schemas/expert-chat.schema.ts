import { z } from "zod";

export const expertChatMessageSchema = z.string().trim()
  .min(1, "Vui lòng nhập tin nhắn.")
  .max(2000, "Tin nhắn tối đa 2.000 ký tự.")
  .refine((value) => !value.startsWith("enc:v1:"), "Tin nhắn không được bắt đầu bằng mã lưu trữ enc:v1:.");
