"use client";

import { useQuery } from "@tanstack/react-query";
import { getReport } from "@/lib/api/reports";
import type { OperationalReport, ReportFilters } from "@/types/reports";

export function useReport(
  filters: ReportFilters,
  role: OperationalReport["role"],
  scopeId?: string,
) {
  return useQuery({
    queryKey: ["reports", role, scopeId ?? null, filters],
    queryFn: async ({ signal }) => {
      const data = await getReport(filters, signal);
      if (
        data.role !== role ||
        (role === "owner" && scopeId && data.scope.organizationId !== scopeId)
      ) {
        throw new Error(
          "Không gian làm việc đã thay đổi. Vui lòng tải lại trang.",
        );
      }
      return data;
    },
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === role &&
      previousQuery.queryKey[2] === (scopeId ?? null)
        ? previousData
        : undefined,
    staleTime: 30_000,
    retry: false,
  });
}
