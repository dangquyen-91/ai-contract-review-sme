import { z } from "zod";

export const dashboardInsightsQuerySchema = z
  .object({
    period: z.enum(["week", "month", "quarter", "year"]).default("month"),
    // Staff: only their own work in the organization.
    mine: z.literal("true").optional(),
  })
  .strict();
