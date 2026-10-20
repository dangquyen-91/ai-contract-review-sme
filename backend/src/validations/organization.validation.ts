import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(200),
  taxCode: z.string().trim().min(1).max(50).optional(),
  address: z.string().trim().min(1).max(500).optional(),
});

export const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    taxCode: z.string().trim().min(1).max(50).nullable().optional(),
    address: z.string().trim().min(1).max(500).nullable().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, 'At least one field is required');

export const organizationIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid organization id'),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
