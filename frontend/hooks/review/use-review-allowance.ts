"use client";

import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/lib/api/billing";
import { invitationKeys } from "@/lib/query-keys/invitations";

export function useReviewAllowance(orgId?: string) {
  return useQuery({
    queryKey: invitationKeys.subscription(orgId ?? ""),
    queryFn: () => billingApi.subscription(orgId!),
    enabled: Boolean(orgId), staleTime: 15_000, retry: false,
  });
}
