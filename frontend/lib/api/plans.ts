import { apiRequest } from "@/lib/api/client";
import type { SubscriptionPlan } from "@/types/subscription";

export const plansApi = {
  list(signal?: AbortSignal) {
    return apiRequest<SubscriptionPlan[]>({ url: "/plans", signal });
  },
};
