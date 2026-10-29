"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "./use-subscription";
import { billingApi } from "@/lib/api/billing";
import { invitationKeys } from "@/lib/query-keys/invitations";
import type { PlanCode } from "@/types/subscription";

export function useSubscriptionManagement(orgId: string) {
  const client = useQueryClient();
  const key = invitationKeys.subscription(orgId);
  const subscription = useSubscription(orgId);
  const invalidate = () => client.invalidateQueries({ queryKey: key });
  const schedule = useMutation({
    mutationFn: (code: PlanCode) => billingApi.scheduleDowngrade(orgId, code),
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: () => billingApi.cancelDowngrade(orgId),
    onSuccess: invalidate,
  });
  return { subscription, schedule, cancel };
}
