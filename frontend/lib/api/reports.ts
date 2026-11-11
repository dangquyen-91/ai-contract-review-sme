import { apiRequest } from "./client";
import type { OperationalReport, ReportFilters } from "@/types/reports";

export function getReport(filters: ReportFilters, signal?: AbortSignal) {
  return apiRequest<OperationalReport>({
    url: "/reports",
    params: filters,
    signal,
    timeout: 35000,
  });
}
