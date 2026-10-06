import { apiRequest } from "@/lib/api/client";
import { readContractStream } from "@/lib/api/contract-stream";
import type { ChatStreamEvent, ContractChatMessage, ContractClause, ContractReviewResult, ContractTextResult, DashboardContract, ProposedRevisionUpdate, RiskFinding, RiskStreamEvent } from "@/types/contracts";


export const contractsApi = {
  getContract(contractId: string) {
    return apiRequest<DashboardContract>({ url: `/contracts/${contractId}` });
  },

  getText(contractId: string) {
    return apiRequest<ContractTextResult>({ url: `/contracts/${contractId}/text` });
  },

  listClauses(contractId: string) {
    return apiRequest<ContractClause[]>({ url: `/contracts/${contractId}/clauses` });
  },

  segmentClauses(contractId: string) {
    return apiRequest<ContractClause[]>({
      url: `/contracts/${contractId}/clauses/segment`, method: "POST", timeout: 180_000,
    });
  },

  generateSummary(contractId: string, analysisFocus?: string) {
    return apiRequest<DashboardContract>({
      url: `/contracts/${contractId}/summary`, method: "POST",
      data: analysisFocus ? { analysisFocus } : {}, timeout: 180_000,
    });
  },

  detectRisks(contractId: string, analysisFocus?: string) {
    return apiRequest<RiskFinding[]>({
      url: `/contracts/${contractId}/risks/detect`, method: "POST",
      data: analysisFocus ? { analysisFocus } : {}, timeout: 180_000,
    });
  },

  streamRisks(contractId: string, onEvent: (event: RiskStreamEvent) => void, analysisFocus?: string, signal?: AbortSignal) {
    return readContractStream<RiskStreamEvent>(
      `/api/contracts/${contractId}/risks/detect/stream`,
      analysisFocus ? { analysisFocus } : {}, onEvent, signal,
    );
  },

  streamChat(contractId: string, message: string, onEvent: (event: ChatStreamEvent) => void, signal?: AbortSignal) {
    return readContractStream<ChatStreamEvent>(
      `/api/contracts/${contractId}/chat/stream`, { message }, onEvent, signal,
    );
  },

  getReview(contractId: string) {
    return apiRequest<ContractReviewResult>({
      url: `/contracts/${contractId}/review`,
      method: "GET",
      timeout: 30_000,
    });
  },

  upload(formData: FormData) {
    return apiRequest<DashboardContract>({
      url: "/contracts",
      method: "POST",
      data: formData,
      timeout: 60_000,
    });
  },

  review(contractId: string, analysisFocus?: string) {
    return apiRequest<ContractReviewResult>({
      url: `/contracts/${contractId}/review`,
      method: "POST",
      data: analysisFocus ? { analysisFocus } : {},
      timeout: 180_000,
    });
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
      timeout: 180_000,
    });
  },
};
