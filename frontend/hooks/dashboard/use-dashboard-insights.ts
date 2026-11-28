"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/dashboard";
import { dashboardKeys } from "@/lib/query-keys/dashboard";
import type { DashboardRole } from "@/config/dashboard-roles";
import type { InsightPeriod } from "@/types/dashboard-insights";

export function useDashboardInsights(
  role: DashboardRole,
  period: InsightPeriod,
  scopeId?: string,
  mine = false,
) {
  return useQuery({
    queryKey: dashboardKeys.insights(role, period, scopeId, mine),
    queryFn: async ({ signal }) => {
      const data = await dashboardApi.getInsights(period, signal, mine);
      if (data.role !== role || (scopeId && data.scope.id !== scopeId) || Boolean(data.scope.mine) !== mine) {
        throw new Error(
          "Không gian làm việc đã thay đổi. Vui lòng tải lại trang.",
        );
      }
      return data;
    },
    staleTime: 30_000,
    refetchInterval: role === "expert" ? 15_000 : 60_000,
    retry: false,
  });
}
