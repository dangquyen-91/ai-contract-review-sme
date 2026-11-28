"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminOperationsApi } from "@/lib/api/admin-operations";
import { adminOperationKeys } from "@/lib/query-keys/admin-operations";
import type { AiJobFilters } from "@/types/admin-operations";

// Jobs move through their stages in minutes; refresh while the page is open.
const LIVE_REFRESH_MS = 30_000;

export function useAiJobOverview() {
  return useQuery({
    queryKey: adminOperationKeys.aiOverview(),
    queryFn: ({ signal }) => adminOperationsApi.aiOverview(signal),
    refetchInterval: LIVE_REFRESH_MS,
  });
}

export function useAiJobs(page: number, limit: number, filters: AiJobFilters) {
  return useQuery({
    queryKey: adminOperationKeys.aiJobList(page, limit, filters),
    queryFn: ({ signal }) => adminOperationsApi.aiJobs(page, limit, filters, signal),
    placeholderData: keepPreviousData,
    refetchInterval: LIVE_REFRESH_MS,
  });
}

export function useCancelAiJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminOperationsApi.cancelAiJob(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: adminOperationKeys.aiJobs }),
  });
}
