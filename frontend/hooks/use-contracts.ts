"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { contractsApi } from "@/lib/api/contracts";
import type { ApiClientError } from "@/lib/api/client";
import type { ContractReviewResult, DashboardContract } from "@/types/dashboard";

type ReviewContractVariables = {
  contractId: string;
  analysisFocus?: string;
};

export const contractMutationKeys = {
  all: ["contracts"] as const,
  upload: ["contracts", "upload"] as const,
  review: ["contracts", "review"] as const,
};

export function useUploadContractMutation() {
  const queryClient = useQueryClient();

  return useMutation<DashboardContract, ApiClientError, FormData>({
    mutationKey: contractMutationKeys.upload,
    mutationFn: (formData) => contractsApi.upload(formData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
  });
}

export function useReviewContractMutation() {
  const queryClient = useQueryClient();

  return useMutation<ContractReviewResult, ApiClientError, ReviewContractVariables>({
    mutationKey: contractMutationKeys.review,
    mutationFn: ({ contractId, analysisFocus }) => contractsApi.review(contractId, analysisFocus),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
  });
}
