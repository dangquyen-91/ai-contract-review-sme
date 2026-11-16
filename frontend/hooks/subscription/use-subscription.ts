"use client";

import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/lib/api/billing";
import { invitationKeys } from "@/lib/query-keys/invitations";

export function useSubscription(accountId?: string | null) {
  return useQuery({
    queryKey: invitationKeys.subscription(accountId ?? ""),
    queryFn: () => billingApi.subscription(accountId!),
    enabled: Boolean(accountId),
    retry: false,
  });
}
