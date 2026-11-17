"use client";

import { useRef, useState } from "react";
import { useSubscriptionManagement } from "@/hooks/subscription/use-subscription-management";
import { usePaymentHistory } from "@/hooks/subscription/use-payments";
import { usePlanQuote } from "@/hooks/subscription/use-plan-quote";
import { paymentsApi } from "@/lib/api/payments";
import {
  blocksNewCheckout,
  isReplaceablePayment,
  safeCheckoutUrl,
} from "@/lib/subscription/payment-state";
import type { SubscriptionPlan } from "@/types/subscription";

export function usePaymentCheckout(orgId: string, plan: SubscriptionPlan) {
  const { subscription, schedule } = useSubscriptionManagement(orgId);
  const history = usePaymentHistory(orgId);
  const current = subscription.data;
  // The server decides the action (purchase, renewal, upgrade, scheduling a
  // downgrade) and the price, including the upgrade credit.
  const quote = usePlanQuote(orgId, plan.code, current);
  const lock = useRef(false);
  const key = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const loading = subscription.isPending || history.isPending || quote.isPending;
  const loadError =
    subscription.error || history.error || quote.error || (!loading && (!current || !quote.data));
  const action = quote.data?.action ?? "purchase";
  const needsSchedule = Boolean(quote.data?.needsSchedule);
  const open = history.data?.items.find(blocksNewCheckout);
  // An abandoned payOS link is cancelled by the server when this checkout starts.
  const replaces = history.data?.items.find(isReplaceablePayment);
  const wrongFamily = Boolean(current?.plan && current.plan.audience !== plan.audience);
  const seatsExceeded = Boolean(current && current.members.count > plan.memberLimit);
  const blockReason = wrongFamily
    ? "Gói này không phù hợp với loại không gian hiện tại. Hãy chọn gói cùng loại."
    : seatsExceeded
      ? `Giảm số thành viên xuống tối đa ${plan.memberLimit} người trước khi chọn gói này.`
      : (quote.data?.blockReason ?? null);

  async function checkout() {
    if (lock.current || loading || loadError || blockReason || open || !current || !quote.data)
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (needsSchedule) {
        await schedule.mutateAsync(plan.code);
        key.current = null;
      } else {
        key.current ??= crypto.randomUUID();
        const order = await paymentsApi.create(orgId, { planCode: plan.code, action }, key.current);
        await history.refetch();
        const target = !order.fulfilledAt && !order.paidAt && safeCheckoutUrl(order.checkoutUrl);
        window.location.assign(target || `/thanh-toan/ket-qua?orderCode=${order.orderCode}`);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Chưa tạo được thanh toán.");
      await Promise.all([history.refetch(), quote.refetch()]);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const reload = () => Promise.all([subscription.refetch(), history.refetch(), quote.refetch()]);
  return {
    loading,
    loadError,
    action,
    needsSchedule,
    quote: quote.data ?? null,
    open,
    replaces,
    blockReason,
    busy,
    error,
    checkout,
    reload,
  };
}
