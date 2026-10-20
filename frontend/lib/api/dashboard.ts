import { apiRequest } from "@/lib/api/client";
import type { DashboardData } from "@/types/dashboard";

export const dashboardApi = {
  getOverview() {
    return apiRequest<DashboardData>({
      url: "/dashboard",
      method: "GET",
    });
  },
};
