import { z } from 'zod';

export const dashboardQuerySchema = z
  .object({
    period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
  })
  .strict();

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
