import { apiRequest } from "@/lib/api/client";
import type { ExpertVerification, ExpertVerificationResult, RequestVerificationInput } from "@/types/expert-verification";

export const expertVerificationApi = {
  shareOriginal(reviewId: string, attempt: number) {
    return apiRequest<null>({ url: `/reviews/${reviewId}/verification/share-original`, method: "POST", data: { attempt, consent: true } });
  },
  get(reviewId: string, signal?: AbortSignal) {
    return apiRequest<ExpertVerificationResult>({ url: `/reviews/${reviewId}/verification`, signal });
  },
  request(reviewId: string, input: RequestVerificationInput) {
    return apiRequest<ExpertVerification>({
      url: `/reviews/${reviewId}/verification/request`,
      method: "POST",
      // This form's consent covers the original file. Older clients omit this field.
      data: { ...input, shareOriginalFile: true },
    });
  },
};
