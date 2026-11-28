"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { adminOperationsApi } from "@/lib/api/admin-operations";
import { adminOperationKeys } from "@/lib/query-keys/admin-operations";
import type { AuditFilters } from "@/types/admin-operations";

export function useAuditLog(page: number, limit: number, filters: AuditFilters) {
  return useQuery({
    queryKey: adminOperationKeys.auditLog(page, limit, filters),
    queryFn: ({ signal }) => adminOperationsApi.auditLog(page, limit, filters, signal),
    placeholderData: keepPreviousData,
  });
}
