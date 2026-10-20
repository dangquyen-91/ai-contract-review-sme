"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePaymentActions, usePaymentOrder } from "@/hooks/use-payments";
import { invitationKeys } from "@/lib/query-keys/invitations";
import { dashboardKeys } from "@/lib/query-keys/dashboard";

export function usePaymentResult(orgId: string, orderCode: number) {
  const query = usePaymentOrder(orgId, orderCode);
  const { sync } = usePaymentActions(orgId);
  const client = useQueryClient();
  const firstSync = useRef(false);
  const lock = useRef(false);
  const refreshed = useRef(false);
  const [error, setError] = useState("");
  const order = query.data;

  useEffect(() => {
    if (!order || order.fulfilledAt || firstSync.current || query.error) return;
    firstSync.current = true;
    // A redirect is not evidence of payment or cancellation. Ask the backend once.
    void sync.mutateAsync(orderCode).catch(() => query.refetch());
  }, [order, orderCode, sync, query]);

  useEffect(() => {
    if (!order?.fulfilledAt || refreshed.current) return;
    refreshed.current = true;
    void Promise.all([
      client.invalidateQueries({
        queryKey: invitationKeys.subscription(orgId),
      }),
      client.invalidateQueries({ queryKey: dashboardKeys.all }),
    ]);
  }, [client, orgId, order?.fulfilledAt]);

  async function check() {
    if (lock.current) return;
    lock.current = true;
    setError("");
    try {
      await sync.mutateAsync(orderCode);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Chưa kiểm tra được đơn. Vui lòng thử lại.",
      );
      await query.refetch();
    } finally {
      lock.current = false;
    }
  }

  return {
    query,
    order,
    pending: sync.isPending,
    error: error || (!order?.fulfilledAt ? sync.error?.message : ""),
    check,
  };
}
