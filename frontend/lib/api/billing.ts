import { apiRequest } from "@/lib/api/client";

export type ReviewAllowance = {
  status: string;
  endsAt?: string | null;
  analysis: { used: number; reserved: number; limit: number; available: number };
};

export const billingApi = {
  subscription(orgId: string) {
    return apiRequest<ReviewAllowance>({ url: `/organizations/${orgId}/subscription` });
  },
};
