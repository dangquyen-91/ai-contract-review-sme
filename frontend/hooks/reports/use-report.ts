"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getReport } from "@/lib/api/reports";
import type { ReportFilters } from "@/types/reports";

export function useReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ["reports", filters],
    queryFn: ({ signal }) => getReport(filters, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: false,
  });
}
