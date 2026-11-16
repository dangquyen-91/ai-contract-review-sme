import { apiRequest } from "@/lib/api/client";
import type { SubscriptionPlan, TopUpPack } from "@/types/subscription";

export const plansApi = {
  list(signal?: AbortSignal) {
    return apiRequest<SubscriptionPlan[]>({ url: "/plans", signal });
  },
  topUpPacks(signal?: AbortSignal) {
    return apiRequest<TopUpPack[]>({ url: "/top-up-packs", signal });
  },
};
