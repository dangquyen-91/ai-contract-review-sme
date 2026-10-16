"use client";

import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { isApiClientError } from "@/lib/api/client";
import { dashboardApi } from "@/lib/api/dashboard";

export function useDashboardOverview() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      try {
        return await dashboardApi.getOverview();
      } catch (error) {
        if (!isApiClientError(error) || error.status !== 403) throw error;
        await authApi.refreshToken();
        return dashboardApi.getOverview();
      }
    },
    retry: false,
    refetchInterval: (query) => query.state.data?.stats.processing ? 30_000 : false,
  });
}
