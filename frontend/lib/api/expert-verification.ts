import { apiRequest } from "@/lib/api/client";
import type { ExpertVerification, ExpertVerificationResult, RequestVerificationInput } from "@/types/expert-verification";

export const expertVerificationApi = {
  get(reviewId: string, signal?: AbortSignal) {
    return apiRequest<ExpertVerificationResult>({ url: `/reviews/${reviewId}/verification`, signal });
  },
  request(reviewId: string, input: RequestVerificationInput) {
    return apiRequest<ExpertVerification>({
      url: `/reviews/${reviewId}/verification/request`,
      method: "POST",
      data: input,
    });
  },
};
