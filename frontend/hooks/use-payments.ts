"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { paymentsApi } from "@/lib/api/payments";
import { paymentKeys } from "@/lib/query-keys/payments";
import { invitationKeys } from "@/lib/query-keys/invitations";
import { dashboardKeys } from "@/lib/query-keys/dashboard";
import type { PaymentOrder } from "@/types/payment";

export function usePaymentHistory(orgId: string, page = 1) {
  return useQuery({ queryKey: [...paymentKeys.list(orgId), page], queryFn: () => paymentsApi.list(orgId, page), enabled: Boolean(orgId), retry: false });
}

export function usePaymentOrder(orgId: string, orderCode: number) {
  return useQuery({
    queryKey: paymentKeys.detail(orgId, orderCode), queryFn: () => paymentsApi.get(orgId, orderCode),
    enabled: Boolean(orgId && orderCode), retry: false,
    // Webhooks update the backend. Poll reads briefly; do not repeatedly mutate or charge.
    refetchInterval: (query) => query.state.data?.fulfilledAt || query.state.error || query.state.dataUpdateCount >= 12
      || ["cancelled", "expired", "failed"].includes(query.state.data?.status ?? "") ? false : 5_000,
  });
}

export function usePaymentActions(orgId: string) {
  const client = useQueryClient();
  const remember = async (order: PaymentOrder) => {
    client.setQueryData(paymentKeys.detail(orgId, order.orderCode), order);
    await client.invalidateQueries({ queryKey: paymentKeys.list(orgId) });
    if (order.fulfilledAt) await Promise.all([
      client.invalidateQueries({ queryKey: invitationKeys.subscription(orgId) }),
      client.invalidateQueries({ queryKey: invitationKeys.membersBase(orgId) }),
      client.invalidateQueries({ queryKey: dashboardKeys.all }),
    ]);
  };
  const sync = useMutation({ mutationFn: (code: number) => paymentsApi.sync(orgId, code), onSuccess: remember });
  const cancel = useMutation({ mutationFn: (code: number) => paymentsApi.cancel(orgId, code), onSuccess: remember });
  return { sync, cancel };
}
