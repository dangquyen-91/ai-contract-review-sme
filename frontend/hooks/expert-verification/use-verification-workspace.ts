"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { expertWorkspaceApi } from "@/lib/api/expert-workspace";
import { expertVerificationKeys as keys } from "@/lib/query-keys/expert-verification";
import { contractKeys } from "@/lib/query-keys/contracts";
import type { ExpertCommand, VerificationQueueFilter } from "@/types/verification-workspace";

export function useVerificationQueue(status: VerificationQueueFilter) {
  return useQuery({
    queryKey: keys.queue(status),
    queryFn: ({ signal }) => expertWorkspaceApi.queue(status, signal),
    refetchInterval: 15000,
    retry: false,
  });
}

export function useVerificationWorkspace(reviewId: string, attempt?: number) {
  return useQuery({
    queryKey: keys.workspace(reviewId, attempt),
    queryFn: ({ signal }) => expertWorkspaceApi.workspace(reviewId, signal, attempt),
    retry: false,
    refetchInterval: (query) => !attempt && ["requested", "in_progress"].includes(query.state.data?.verification.status ?? "") && !query.state.error ? 15000 : false,
  });
}

export function useExpertCommand(reviewId: string, contractId?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ["expert-verification", reviewId, "command"],
    mutationFn: (command: ExpertCommand) => expertWorkspaceApi.command(reviewId, command),
    retry: false,
    onSettled: async () => {
      await client.cancelQueries({ queryKey: keys.workspace(reviewId) });
      await Promise.all([
        client.invalidateQueries({ queryKey: keys.workspace(reviewId) }),
        client.invalidateQueries({ queryKey: keys.queues }),
        client.invalidateQueries({ queryKey: keys.workLists }),
        client.invalidateQueries({ queryKey: keys.detail(reviewId), exact: true }),
        ...(contractId ? [client.invalidateQueries({ queryKey: contractKeys.result(contractId) }), client.invalidateQueries({ queryKey: contractKeys.findings(contractId) })] : []),
      ]);
    },
  });
}
