"use client";

import { useQuery } from "@tanstack/react-query";
import { plansApi } from "@/lib/api/plans";
import { planKeys } from "@/lib/query-keys/plans";

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: planKeys.all,
    queryFn: ({ signal }) => plansApi.list(signal),
    staleTime: 5 * 60_000,
    retry: false,
  });
}
