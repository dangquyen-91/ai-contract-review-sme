import { z } from 'zod';
import {
  findVietnamAddress,
  normalizeVietnamAddress,
} from '../services/organization/vietnamAddress';

export const listOrganizationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).default(''),
  industry: z.string().trim().max(50).default(''),
});

const vietnamAddressSchema = z
  .object({
    provinceCode: z
      .string()
      .trim()
      .regex(/^\d{2}$/, 'Vui lòng chọn tỉnh/thành phố.'),
    wardCode: z
      .string()
      .trim()
      .regex(/^\d{5}$/, 'Vui lòng chọn xã/phường/đặc khu.'),
    addressLine: z
      .string()
      .trim()
      .min(2, 'Vui lòng nhập địa chỉ chi tiết.')
      .max(300, 'Địa chỉ chi tiết tối đa 300 ký tự.'),
  })
  .strict()
  .refine((value) => Boolean(findVietnamAddress(value.provinceCode, value.wardCode)), {
    path: ['wardCode'],
    message: 'Xã/phường không thuộc tỉnh/thành phố đã chọn.',
  });

const taxCodeSchema = z
  .string()
  .trim()
  .regex(
    /^\d{10}(?:-?\d{3})?$/,
    'Mã số thuế gồm 10 chữ số hoặc 10 chữ số và mã chi nhánh 3 chữ số.',
  );

export const createOrganizationSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    taxCode: taxCodeSchema,
    industry: z.string().trim().min(1, 'Vui lòng chọn ngành kinh doanh.').max(50),
    addressDetails: vietnamAddressSchema,
  })
  .transform(({ addressDetails, ...input }) => ({
    ...input,
    ...normalizeVietnamAddress(addressDetails),
  }));

export const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    taxCode: taxCodeSchema.optional(),
    addressDetails: vietnamAddressSchema.optional(),
    industry: z.string().trim().min(1).max(50).optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, 'Vui lòng cập nhật ít nhất một trường.')
  .transform(({ addressDetails, ...input }) => ({
    ...input,
    ...(addressDetails ? normalizeVietnamAddress(addressDetails) : {}),
  }));

export const organizationIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid organization id'),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
