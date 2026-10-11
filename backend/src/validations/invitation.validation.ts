import { z } from 'zod';
import { INVITATION_ROLES } from '../models/organizationInvitation.model';
import { organizationIdParamSchema } from './organization.validation';

export const invitationTokenSchema = z.string().regex(/^[a-f0-9]{64}$/, 'Invalid invitation token');
export const invitationTokenBodySchema = z.object({ token: invitationTokenSchema });
export const createInvitationSchema = z.object({
  email: z.string().trim().email().max(254).toLowerCase(),
  role: z.enum(INVITATION_ROLES),
});
export const invitationParamsSchema = organizationIdParamSchema.extend({
  invitationId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid invitation id'),
});
export const invitationPaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
