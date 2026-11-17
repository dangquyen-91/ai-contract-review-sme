import { apiRequest } from "@/lib/api/client";
import type { ExpertChatPage, ExpertChatQuery, ExpertChatMessage, SendExpertMessage } from "@/types/expert-consultation";

export const expertConsultationApi = {
  messages(reviewId: string, params: ExpertChatQuery, signal?: AbortSignal) {
    return apiRequest<ExpertChatPage>({
      url: `/reviews/${reviewId}/verification/messages`, params, signal,
    });
  },
  send(reviewId: string, input: SendExpertMessage) {
    return apiRequest<{ message: ExpertChatMessage; replayed: boolean }>({
      url: `/reviews/${reviewId}/verification/messages`, method: "POST", data: input,
    });
  },
};
