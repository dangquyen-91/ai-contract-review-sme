"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clearReviewSession, executeReview } from "@/lib/review-session";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardKeys } from "@/lib/query-keys/dashboard";
import { contractsApi } from "@/lib/api/contracts";
import { ApiClientError } from "@/lib/api/client";
import type { ChatStreamEvent, ContractListResult, ContractReviewResult, ContractReviewRun, DashboardContract, ProposedRevisionUpdate, RiskFinding } from "@/types/contracts";

import { contractKeys, contractMutationKeys } from "@/lib/query-keys/contracts";
import type { DashboardContractFilter } from "@/types/dashboard";

type ReviewContractVariables = {
  contractId: string;
  analysisFocus?: string;
  resumeOnly?: boolean;
  onProgress?: (review: ContractReviewRun) => void;
};

export function useDeleteContract() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: contractsApi.remove,
    onSuccess: async (_, id) => {
      clearReviewSession(id);
      await client.cancelQueries({ queryKey: ["contracts", id] });
      client.removeQueries({ queryKey: ["contracts", id] });
      await Promise.all([
        client.invalidateQueries({ queryKey: contractKeys.lists }),
        client.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]);
    },
  });
}

export function useContractsList(
  filter: DashboardContractFilter & { page?: number; search?: string },
  options: { scope?: string; initialData?: ContractListResult; retry?: boolean; pollProcessing?: boolean; enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: contractKeys.list(filter, options.scope),
    queryFn: () => contractsApi.list(filter),
    enabled: options.enabled,
    initialData: options.initialData,
    retry: options.retry ?? false,
    refetchInterval: options.pollProcessing
      ? (query) => query.state.data?.items.some((item) => item.status === "processing") ? 30_000 : false
      : false,
  });
}

export function useContractProfiles() {
  return useQuery({ queryKey: contractKeys.profiles, queryFn: contractsApi.listProfiles, staleTime: 5 * 60_000 });
}

export function useContractKeyTerms(contractId: string) {
  return useQuery({
    queryKey: contractKeys.keyTerms(contractId),
    queryFn: () => contractsApi.getKeyTerms(contractId),
    enabled: Boolean(contractId),
  });
}

export function useContract(contractId: string) {
  return useQuery({
    ...contractDetailQuery(contractId),
    enabled: Boolean(contractId),
  });
}

export function useContractText(contractId: string, options: {
  redacted?: boolean;
  redactionMode?: "token" | "partial";
  enabled?: boolean;
  version?: string;
} = {}) {
  const mode = options.redactionMode ?? "token";
  return useQuery({
    queryKey: contractKeys.textView(contractId, Boolean(options.redacted), mode, options.version),
    queryFn: async ({ signal }) => {
      const response = await contractsApi.getText(contractId, { redacted: options.redacted, redactionMode: mode, signal });
      if (options.redacted && (response.redacted !== true || (mode === "partial" && response.redactionMode !== "partial") || typeof response.text !== "string")) {
        throw new Error("Máy chủ chưa trả về văn bản đã che.");
      }
      if (!options.redacted && (response.redacted !== false || typeof response.text !== "string")) {
        throw new Error("Máy chủ chưa trả về văn bản đầy đủ hợp lệ.");
      }
      return response;
    },
    enabled: Boolean(contractId) && options.enabled !== false,
    retry: false,
    refetchOnWindowFocus: false,
    ...(!options.redacted ? { gcTime: 0 } : {}),
  });
}

export function useContractClauses(contractId: string) {
  return useQuery({
    queryKey: contractKeys.clauses(contractId),
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
      queryClient.invalidateQueries({ queryKey: contractKeys.chat(contractId) }),
  });
}

export function useUploadContractMutation() {
  const queryClient = useQueryClient();

  return useMutation<DashboardContract, ApiClientError, FormData>({
    mutationKey: contractMutationKeys.upload,
    mutationFn: (formData) => contractsApi.upload(formData),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: contractKeys.lists }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
    ]),
  });
}

export function useContractFile(contractId: string, version?: string, redacted = false) {
  return useQuery({
    queryKey: redacted ? contractKeys.redactedFile(contractId, version) : contractKeys.file(contractId, version),
    queryFn: ({ signal }) => contractsApi.getFile(contractId, signal, redacted),
    enabled: Boolean(contractId), retry: false, refetchOnWindowFocus: false, gcTime: 0,
  });
}

const contractDetailQuery = (contractId: string) => ({
  queryKey: contractKeys.detail(contractId),
  queryFn: () => contractsApi.getContract(contractId),
  staleTime: 30_000,
});

export function useLoadContract() {
  const queryClient = useQueryClient();
  return useCallback((contractId: string) => queryClient.fetchQuery(contractDetailQuery(contractId)), [queryClient]);
}

export function useContractReviewResult(contractId: string) {
  const queryClient = useQueryClient();
  const controller = useRef<AbortController | null>(null);
  const cancel = useCallback(() => controller.current?.abort(), []);
  useEffect(() => () => controller.current?.abort(), []);
  const query = useQuery({
    queryKey: contractKeys.result(contractId),
    queryFn: ({ signal }) => contractsApi.getReview(contractId, signal),
    enabled: false, retry: false, staleTime: 0, refetchOnWindowFocus: false,
  });
  const load = useCallback(async (id: string) => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    try {
      const result = await queryClient.fetchQuery({
        queryKey: contractKeys.result(id),
        queryFn: ({ signal }) => contractsApi.getReview(id, AbortSignal.any([signal, request.signal])),
        retry: false, staleTime: 0,
      });
      request.signal.throwIfAborted();
      clearReviewSession(id);
      return result;
    } catch (error) {
      if (request.signal.aborted) throw request.signal.reason;
      throw error;
    }
  }, [queryClient]);
  return { ...query, load, cancel, isLoadingResult: query.isFetching };
}

function updateCachedFinding(queryClient: ReturnType<typeof useQueryClient>, contractId: string, finding: RiskFinding) {
  queryClient.setQueryData<ContractReviewResult>(contractKeys.result(contractId), (result) => result ? {
    ...result, findings: result.findings.map((item) => (item.id ?? item._id) === (finding.id ?? finding._id) ? finding : item),
  } : result);
  return queryClient.invalidateQueries({ queryKey: contractKeys.findings(contractId) });
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
    onSuccess: (result, { contractId }) => queryClient.setQueryData(contractKeys.result(contractId), result),
    // Segmentation may have succeeded even when summary or risk detection failed.
    onSettled: (_result, error, { contractId }) => {
      queryClient.invalidateQueries({ queryKey: ["org-subscription"] });
      queryClient.invalidateQueries({ queryKey: contractKeys.lists });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
      queryClient.invalidateQueries({ queryKey: contractKeys.clauses(contractId) });
      queryClient.invalidateQueries({ queryKey: contractKeys.keyTerms(contractId) });
      queryClient.invalidateQueries({ queryKey: contractKeys.fileBase(contractId) });
      queryClient.invalidateQueries({ queryKey: contractKeys.text(contractId) });
      queryClient.invalidateQueries({ queryKey: contractKeys.findings(contractId) });
      if (error) queryClient.invalidateQueries({ queryKey: contractKeys.result(contractId) });
    },

  });
  return { ...mutation, cancel, reconnecting };
}

export function useContractFindings(contractId: string) {
  return useQuery({
    queryKey: contractKeys.findings(contractId),
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
    onSuccess: (finding, { contractId }) => updateCachedFinding(queryClient, contractId, finding),
  });
}

export function useRemoveProposedRevisionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contractId, findingId }: { contractId: string; findingId: string }) =>
      contractsApi.removeProposedRevision(contractId, findingId),
    onSuccess: (finding, { contractId }) => updateCachedFinding(queryClient, contractId, finding),
  });
}

export function useContractChatMessages(contractId: string) {
  return useQuery({
    queryKey: contractKeys.chat(contractId),
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
      queryClient.invalidateQueries({ queryKey: contractKeys.chat(contractId) }),
  });
}
