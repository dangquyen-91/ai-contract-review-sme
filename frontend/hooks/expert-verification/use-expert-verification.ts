"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractsApi } from "@/lib/api/contracts";
import { expertVerificationApi } from "@/lib/api/expert-verification";
import { expertVerificationKeys } from "@/lib/query-keys/expert-verification";
import { latestVerifiableRun } from "@/lib/review/expert-verification";
import type { RequestVerificationInput, ExpertVerificationResult } from "@/types/expert-verification";

export function useVerificationReview(contractId: string, enabled: boolean, versionId?: string) {
  return useQuery({
    queryKey: expertVerificationKeys.runs(contractId),
    queryFn: ({ signal }) => contractsApi.listReviewRuns(contractId, signal),
    select: (runs) => latestVerifiableRun(runs, versionId),
    enabled: enabled && Boolean(contractId),
    retry: false,
    staleTime: 0,
  });
}

export function useExpertVerification(reviewId: string) {
  return useQuery({
    queryKey: expertVerificationKeys.detail(reviewId),
    queryFn: ({ signal }) => expertVerificationApi.get(reviewId, signal),
    enabled: Boolean(reviewId),
    retry: false,
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.verification?.status;
      return !query.state.error && (status === "requested" || status === "in_progress") ? 15_000 : false;
    },
  });
}

export function useRequestExpertVerification(reviewId: string, contractId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: RequestVerificationInput) => expertVerificationApi.request(reviewId, input),
    retry: false,
    onSuccess: async (verification) => {
      await client.cancelQueries({ queryKey: expertVerificationKeys.detail(reviewId) });
      client.setQueryData<ExpertVerificationResult>(expertVerificationKeys.detail(reviewId), (current) => ({
        verification, actions: current?.actions ?? [],
      }));
    },
    onSettled: () => Promise.all([
      client.invalidateQueries({ queryKey: expertVerificationKeys.detail(reviewId) }),
      client.invalidateQueries({ queryKey: expertVerificationKeys.runs(contractId) }),
    ]),
  });
}
