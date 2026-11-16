import { z } from "zod";

export const organizationCreateFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tên doanh nghiệp cần ít nhất 2 ký tự.")
    .max(200, "Tên doanh nghiệp tối đa 200 ký tự."),
  taxCode: z
    .string()
    .trim()
    .regex(
      /^\d{10}(?:-?\d{3})?$/,
      "Mã số thuế gồm 10 chữ số hoặc 10 chữ số và mã chi nhánh 3 chữ số.",
    ),
  industry: z
    .string()
    .trim()
    .min(1, "Vui lòng chọn ngành kinh doanh.")
    .max(50, "Ngành kinh doanh không hợp lệ."),
  provinceCode: z
    .string()
    .trim()
    .regex(/^\d{2}$/, "Vui lòng chọn tỉnh/thành phố."),
  wardCode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Vui lòng chọn xã/phường/đặc khu."),
  addressLine: z
    .string()
    .trim()
    .min(2, "Vui lòng nhập địa chỉ chi tiết.")
    .max(300, "Địa chỉ chi tiết tối đa 300 ký tự."),
});

export type OrganizationCreateFormValues = z.infer<
  typeof organizationCreateFormSchema
>;
