import { z } from 'zod';

export const dashboardQuerySchema = z
  .object({
    period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
    // Staff only: limit the figures to the caller's own work in the organization.
    mine: z.literal('true').optional(),
  })
  .strict();

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
