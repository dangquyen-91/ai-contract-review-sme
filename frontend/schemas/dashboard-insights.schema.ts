import { z } from "zod";

export const dashboardInsightsQuerySchema = z
  .object({
    period: z.enum(["week", "month", "quarter", "year"]).default("month"),
  })
  .strict();
