import { apiClient, apiRequest } from "@/lib/api/client";
import type { DashboardContractFilter } from "@/types/dashboard";
import type { ContractShareSummary } from "@/types/contracts";
import { readContractStream } from "@/lib/api/contract-stream";
import type { ChatStreamEvent, ContractChatMessage, ContractClause, ContractKeyTerms, ContractListResult, ContractProfile, ContractReviewResult, ContractReviewRun, ContractTextResult, DashboardContract, ProposedRevisionUpdate, RiskFinding } from "@/types/contracts";


export const contractsApi = {
  streamReview(reviewId: string, onEvent: (event: { event: string; data: ContractReviewRun }) => void, signal?: AbortSignal) {
    return readContractStream(`/api/reviews/${reviewId}/events`, undefined, onEvent, signal);
  },
  remove(contractId: string) {
    return apiRequest<void>({ url: `/contracts/${contractId}`, method: "DELETE" });
  },
  getShareSummary(contractId: string, expectedUpdatedAt?: string, signal?: AbortSignal) {
    return apiRequest<ContractShareSummary>({
      url: `/contracts/${contractId}/share-summary`, params: { expectedUpdatedAt }, signal,
    });
  },
  listProfiles() {
    return apiRequest<ContractProfile[]>({ url: "/contract-profiles" });
  },
  async list(filter: DashboardContractFilter & { page?: number; search?: string } = {}): Promise<ContractListResult> {
    const response = await apiClient.get<{ data: DashboardContract[]; meta: { total: number; page: number; limit: number } }>("/contracts", {
      params: { ...filter, limit: 10, sortBy: "updatedAt", sortOrder: "desc" },
    });
    return { items: response.data.data.map((contract) => ({ ...contract, overallRiskLevel: contract.currentVersion?.overallRiskLevel ?? contract.overallRiskLevel ?? "none" })), total: response.data.meta.total };
  },
  getContract(contractId: string) {
    return apiRequest<DashboardContract>({ url: `/contracts/${contractId}` });
  },

  async getFile(contractId: string, signal?: AbortSignal, redacted = false) {
    const response = await apiClient.get<Blob>(`/contracts/${contractId}/file`, {
      responseType: "blob", signal, timeout: 60_000,
      params: redacted ? { redacted: true } : undefined,
    });
    return response.data;
  },

  getText(contractId: string, options: { redacted?: boolean; redactionMode?: "token" | "partial"; signal?: AbortSignal } = {}) {
    return apiRequest<ContractTextResult>({
      url: `/contracts/${contractId}/text`,
      params: options.redacted ? { redacted: true, redactionMode: options.redactionMode } : undefined,
      signal: options.signal,
    });
  },

  listClauses(contractId: string) {
    return apiRequest<ContractClause[]>({ url: `/contracts/${contractId}/clauses` });
  },

  streamChat(contractId: string, message: string, onEvent: (event: ChatStreamEvent) => void, signal?: AbortSignal) {
    return readContractStream<ChatStreamEvent>(
      `/api/contracts/${contractId}/chat/stream`, { message }, onEvent, signal,
    );
  },

  getReview(contractId: string, signal?: AbortSignal) {
    return apiRequest<ContractReviewResult>({
      url: `/contracts/${contractId}/review`,
      method: "GET",
      timeout: 30_000,
      signal,
    });
  },

  upload(formData: FormData) {
    return apiRequest<DashboardContract>({
      url: "/contracts",
      method: "POST",
      data: formData,
      headers: { Prefer: "respond-async" },
      timeout: 60_000,
    });
  },

  startReview(contractId: string, idempotencyKey: string, analysisFocus?: string, signal?: AbortSignal) {
    return apiRequest<ContractReviewRun>({
      url: `/contracts/${contractId}/review`,
      method: "POST",
      data: analysisFocus ? { analysisFocus } : {},
      headers: { "Idempotency-Key": idempotencyKey },
      signal,
    });
  },

  getReviewRun(reviewId: string, signal?: AbortSignal) {
    return apiRequest<ContractReviewRun>({ url: `/reviews/${reviewId}`, signal });
  },

  listReviewRuns(contractId: string, signal?: AbortSignal) {
    return apiRequest<ContractReviewRun[]>({ url: `/contracts/${contractId}/reviews`, signal });
  },

  getKeyTerms(contractId: string) {
    return apiRequest<ContractKeyTerms>({ url: `/contracts/${contractId}/key-terms` });
  },

  listFindings(contractId: string) {
    return apiRequest<RiskFinding[]>({ url: `/contracts/${contractId}/risks` });
  },

  updateProposedRevision(contractId: string, findingId: string, update: ProposedRevisionUpdate) {
    return apiRequest<RiskFinding>({
      url: `/contracts/${contractId}/risks/${findingId}`,
      method: "PATCH",
      data: update,
    });
  },

  removeProposedRevision(contractId: string, findingId: string) {
    return apiRequest<RiskFinding>({
      url: `/contracts/${contractId}/risks/${findingId}/revision`,
      method: "DELETE",
    });
  },

  listChatMessages(contractId: string) {
    return apiRequest<ContractChatMessage[]>({ url: `/contracts/${contractId}/chat` });
  },

  askAboutContract(contractId: string, message: string) {
    return apiRequest<{ reply: string }>({
      url: `/contracts/${contractId}/chat`,
      method: "POST",
      data: { message },
      headers: { "Idempotency-Key": crypto.randomUUID() },
      timeout: 180_000,
    });
  },
};
