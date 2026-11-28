import { apiRequest } from "@/lib/api/client";
import type { DashboardData } from "@/types/dashboard";
import type { DashboardInsights, InsightPeriod } from "@/types/dashboard-insights";

export const dashboardApi = {
  getInsights(period: InsightPeriod, signal?: AbortSignal, mine = false) {
    return apiRequest<DashboardInsights>({ url: "/dashboard/insights", params: { period, ...(mine ? { mine: "true" } : {}) }, signal, timeout: 35_000 });
  },
  getOverview() {
    return apiRequest<DashboardData>({
      url: "/dashboard",
      method: "GET",
    });
  },
};
