"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractsApi } from "@/lib/api/contracts";
import type { ApiClientError } from "@/lib/api/client";
import type { ChatStreamEvent, ContractReviewResult, DashboardContract, ProposedRevisionUpdate, RiskStreamEvent } from "@/types/contracts";

type ReviewContractVariables = {
  contractId: string;
  analysisFocus?: string;
};

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

export function useSegmentClausesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) => contractsApi.segmentClauses(contractId),
    onSuccess: (_clauses, contractId) => {
      queryClient.invalidateQueries({ queryKey: contractMutationKeys.clauses(contractId) });
      queryClient.invalidateQueries({ queryKey: contractMutationKeys.detail(contractId) });
      queryClient.invalidateQueries({ queryKey: contractMutationKeys.findings(contractId) });
      queryClient.invalidateQueries({ queryKey: contractMutationKeys.getReview });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useGenerateSummaryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contractId, analysisFocus }: ReviewContractVariables) =>
      contractsApi.generateSummary(contractId, analysisFocus),
    onSuccess: (_contract, { contractId }) =>
      queryClient.invalidateQueries({ queryKey: contractMutationKeys.detail(contractId) }),
  });
}

export function useDetectRisksMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contractId, analysisFocus }: ReviewContractVariables) =>
      contractsApi.detectRisks(contractId, analysisFocus),
    onSuccess: (_findings, { contractId }) => {
      queryClient.invalidateQueries({ queryKey: contractMutationKeys.findings(contractId) });
      queryClient.invalidateQueries({ queryKey: contractMutationKeys.detail(contractId) });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useStreamRisksMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contractId, analysisFocus, onEvent, signal }: ReviewContractVariables & {
      onEvent: (event: RiskStreamEvent) => void; signal?: AbortSignal;
    }) => contractsApi.streamRisks(contractId, onEvent, analysisFocus, signal),
    onSuccess: (_result, { contractId }) => {
      queryClient.invalidateQueries({ queryKey: contractMutationKeys.findings(contractId) });
      queryClient.invalidateQueries({ queryKey: contractMutationKeys.detail(contractId) });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
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

  return useMutation<ContractReviewResult, ApiClientError, ReviewContractVariables>({
    mutationKey: contractMutationKeys.review,
    mutationFn: ({ contractId, analysisFocus }) => contractsApi.review(contractId, analysisFocus),
    // Segmentation may have succeeded even when summary or risk detection failed.
    onSettled: (_result, _error, { contractId }) => {
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
