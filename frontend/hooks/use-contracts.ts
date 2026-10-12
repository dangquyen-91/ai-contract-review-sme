"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clearReviewSession, executeReview } from "@/lib/review-session";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractsApi } from "@/lib/api/contracts";
import { ApiClientError } from "@/lib/api/client";
import type { ChatStreamEvent, ContractReviewResult, ContractReviewRun, DashboardContract, ProposedRevisionUpdate } from "@/types/contracts";

type ReviewContractVariables = {
  contractId: string;
  analysisFocus?: string;
  resumeOnly?: boolean;
  onProgress?: (review: ContractReviewRun) => void;
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
  const controller = useRef<AbortController | null>(null);
  const cancel = useCallback(() => controller.current?.abort(), []);
  useEffect(() => () => controller.current?.abort(), []);
  const mutation = useMutation<ContractReviewResult, Error, string>({
    mutationKey: contractMutationKeys.getReview,
    mutationFn: async (id) => {
      controller.current?.abort();
      const request = new AbortController();
      controller.current = request;
      try {
        const result = await contractsApi.getReview(id, request.signal);
        request.signal.throwIfAborted();
        clearReviewSession(id);
        return result;
      } catch (error) {
        if (request.signal.aborted) throw request.signal.reason;
        throw error;
      }
    },
  });
  return { ...mutation, cancel };
}

export function useReviewContractMutation() {
  const queryClient = useQueryClient();
  const controller = useRef<AbortController | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const cancel = useCallback(() => { controller.current?.abort(); setReconnecting(false); }, []);
  useEffect(() => () => controller.current?.abort(), []);
  const mutation = useMutation<ContractReviewResult, Error, ReviewContractVariables>({
    mutationKey: contractMutationKeys.review,
    mutationFn: async ({ contractId, analysisFocus, onProgress, resumeOnly }) => {
      controller.current?.abort();
      const request = new AbortController();
      controller.current = request;
      setReconnecting(false);
      try { return await executeReview({ contractId, analysisFocus, resumeOnly, signal: request.signal, onProgress, onConnection: setReconnecting }); }
      finally { if (!request.signal.aborted) setReconnecting(false); }
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
  return { ...mutation, cancel, reconnecting };
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
