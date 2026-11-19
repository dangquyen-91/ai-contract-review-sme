import { apiRequest } from "@/lib/api/client";
import type { OrganizationSubscription, PlanCode, PlanQuote } from "@/types/subscription";

export type ReviewAllowance = {
  status: string;
  endsAt?: string | null;
  analysis: { used: number; reserved: number; limit: number; available: number };
};

export const billingApi = {
  scheduleDowngrade(orgId: string, planCode: PlanCode) {
    return apiRequest<{ planCode: PlanCode; effectiveAt: string }>({ url: `/organizations/${orgId}/subscription/downgrade`, method: "POST", data: { planCode } });
  },
  cancelDowngrade(orgId: string) {
    return apiRequest<void>({ url: `/organizations/${orgId}/subscription/downgrade`, method: "DELETE" });
  },
  quote(orgId: string, planCode: PlanCode, signal?: AbortSignal) {
    return apiRequest<PlanQuote>({ url: `/organizations/${orgId}/subscription/quote`, params: { planCode }, signal });
  },
  subscription(orgId: string) {
    return apiRequest<OrganizationSubscription>({ url: `/organizations/${orgId}/subscription` });
  },
};
