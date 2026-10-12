"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractsApi } from "@/lib/api/contracts";
import { ApiClientError } from "@/lib/api/client";
import type { ChatStreamEvent, ContractReviewResult, ContractReviewRun, DashboardContract, ProposedRevisionUpdate } from "@/types/contracts";

type ReviewContractVariables = {
  contractId: string;
  analysisFocus?: string;
  onProgress?: (review: ContractReviewRun) => void;
};

async function waitForReview(reviewId: string, onProgress?: (review: ContractReviewRun) => void) {
  const deadline = Date.now() + 20 * 60_000;
  while (Date.now() < deadline) {
    const review = await contractsApi.getReviewRun(reviewId);
    onProgress?.(review);
    if (review.status === "completed") return;
    if (review.status === "failed") throw new Error(review.error || "AI không thể hoàn tất lượt rà soát.");
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error("Lượt rà soát vẫn đang chạy. Hãy mở lại hợp đồng để xem kết quả.");
}

export const contractMutationKeys = {
  all: ["contracts"] as const,
  upload: ["contracts", "upload"] as const,
  review: ["contracts", "review"] as const,
  getReview: ["contracts", "getReview"] as const,
  findings: (contractId: string) => ["contracts", contractId, "findings"] as const,
  chat: (contractId: string) => ["contracts", contractId, "chat"] as const,
  detail: (contractId: string) => ["contracts", contractId, "detail"] as const,
  text: (contractId: string) => ["contracts", contractId, "text"] as const,
  clauses: (contractId: string) => ["contracts", contractId, "clauses"] as const,
};

export function useContract(contractId: string) {
  return useQuery({
    queryKey: contractMutationKeys.detail(contractId),
    queryFn: () => contractsApi.getContract(contractId),
    enabled: Boolean(contractId),
  });
}

export function useContractText(contractId: string) {
  return useQuery({
    queryKey: contractMutationKeys.text(contractId),
    queryFn: () => contractsApi.getText(contractId),
    enabled: Boolean(contractId),
  });
}

export function useContractClauses(contractId: string) {
  return useQuery({
    queryKey: contractMutationKeys.clauses(contractId),
    queryFn: () => contractsApi.listClauses(contractId),
    enabled: Boolean(contractId),
  });
}

export function useStreamChatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contractId, message, onEvent, signal }: {
      contractId: string; message: string; onEvent: (event: ChatStreamEvent) => void; signal?: AbortSignal;
    }) => contractsApi.streamChat(contractId, message, onEvent, signal),
    onSuccess: (_result, { contractId }) =>
      queryClient.invalidateQueries({ queryKey: contractMutationKeys.chat(contractId) }),
  });
}

export function useUploadContractMutation() {
  const queryClient = useQueryClient();

  return useMutation<DashboardContract, ApiClientError, FormData>({
    mutationKey: contractMutationKeys.upload,
    mutationFn: (formData) => contractsApi.upload(formData),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["member-contracts"] }),
    ]),
  });
}

export function useGetContractReviewMutation() {
  return useMutation<ContractReviewResult, ApiClientError, string>({
    mutationKey: contractMutationKeys.getReview,
    mutationFn: (contractId) => contractsApi.getReview(contractId),
  });
}

export function useReviewContractMutation() {
  const queryClient = useQueryClient();

  return useMutation<ContractReviewResult, Error, ReviewContractVariables>({
    mutationKey: contractMutationKeys.review,
    mutationFn: async ({ contractId, analysisFocus, onProgress }) => {
      const storageKey = `lawscan_review_${contractId}`;
      let review: ContractReviewRun | undefined;
      const previousId = sessionStorage.getItem(storageKey);
      if (previousId) {
        try {
          review = await contractsApi.getReviewRun(previousId);
          if (review.status === "failed") {
            sessionStorage.removeItem(storageKey);
            review = undefined;
          }
        } catch (error) {
          if (!(error instanceof ApiClientError) || error.status !== 404) throw error;
          sessionStorage.removeItem(storageKey);
          review = undefined;
        }
      }
      if (!review) {
        try {
          review = await contractsApi.startReview(contractId, crypto.randomUUID(), analysisFocus);
        } catch (error) {
          if (!(error instanceof ApiClientError) || ![409, 503].includes(error.status ?? 0)) throw error;
          const runs = await contractsApi.listReviewRuns(contractId);
          const active = runs.find((run) => run.status === "queued" || run.status === "running");
          if (!active) throw error;
          review = active;
        }
        sessionStorage.setItem(storageKey, review._id);
      }
      onProgress?.(review);
      if (review.status !== "completed") await waitForReview(review._id, onProgress);
      const result = await contractsApi.getReview(contractId);
      sessionStorage.removeItem(storageKey);
      return result;
    },
    // Segmentation may have succeeded even when summary or risk detection failed.
    onSettled: (_result, _error, { contractId }) => {
      queryClient.invalidateQueries({ queryKey: ["member-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: contractMutationKeys.detail(contractId) });
      queryClient.invalidateQueries({ queryKey: contractMutationKeys.clauses(contractId) });
      queryClient.invalidateQueries({ queryKey: contractMutationKeys.findings(contractId) });
      queryClient.invalidateQueries({ queryKey: contractMutationKeys.getReview });
    },
  });
}

export function useContractFindings(contractId: string) {
  return useQuery({
    queryKey: contractMutationKeys.findings(contractId),
    queryFn: () => contractsApi.listFindings(contractId),
    enabled: Boolean(contractId),
  });
}

export function useUpdateProposedRevisionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contractId, findingId, update }: {
      contractId: string; findingId: string; update: ProposedRevisionUpdate;
    }) => contractsApi.updateProposedRevision(contractId, findingId, update),
    onSuccess: (_finding, { contractId }) => {
      queryClient.invalidateQueries({ queryKey: contractMutationKeys.findings(contractId) });
      queryClient.invalidateQueries({ queryKey: contractMutationKeys.getReview });
    },
  });
}

export function useRemoveProposedRevisionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contractId, findingId }: { contractId: string; findingId: string }) =>
      contractsApi.removeProposedRevision(contractId, findingId),
    onSuccess: (_finding, { contractId }) => {
      queryClient.invalidateQueries({ queryKey: contractMutationKeys.findings(contractId) });
      queryClient.invalidateQueries({ queryKey: contractMutationKeys.getReview });
    },
  });
}

export function useContractChatMessages(contractId: string) {
  return useQuery({
    queryKey: contractMutationKeys.chat(contractId),
    queryFn: () => contractsApi.listChatMessages(contractId),
    enabled: Boolean(contractId),
  });
}

export function useAskAboutContractMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contractId, message }: { contractId: string; message: string }) =>
      contractsApi.askAboutContract(contractId, message),
    onSuccess: (_reply, { contractId }) =>
      queryClient.invalidateQueries({ queryKey: contractMutationKeys.chat(contractId) }),
  });
}
