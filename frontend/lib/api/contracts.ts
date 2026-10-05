import { apiRequest } from "@/lib/api/client";
import type { ContractReviewResult, DashboardContract } from "@/types/dashboard";

export const contractsApi = {
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
};
