"use client";

import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/lib/api/billing";
import type { PlanCode } from "@/types/subscription";

/** Server quote for checking out `planCode`; refreshed whenever the subscription changes. */
export function usePlanQuote(orgId: string, planCode: PlanCode, version: unknown) {
  return useQuery({
    queryKey: ["plan-quote", orgId, planCode, version],
    queryFn: ({ signal }) => billingApi.quote(orgId, planCode, signal),
    enabled: Boolean(orgId),
    retry: false,
    staleTime: 0,
  });
}
