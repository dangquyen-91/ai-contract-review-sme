"use client";

import { useRef, useState } from "react";
import { useSubscriptionManagement } from "@/hooks/use-subscription-management";
import { usePaymentHistory } from "@/hooks/use-payments";
import { paymentsApi } from "@/lib/api/payments";
import {
  isUnfinishedPayment,
  paymentAction,
  safeCheckoutUrl,
} from "@/lib/payment-state";
import type { SubscriptionPlan } from "@/types/subscription";

export function usePaymentCheckout(orgId: string, plan: SubscriptionPlan) {
  const { subscription, schedule } = useSubscriptionManagement(orgId);
  const history = usePaymentHistory(orgId);
  const lock = useRef(false);
  const key = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = subscription.data;
  const loading = subscription.isPending || history.isPending;
  const loadError =
    subscription.error || history.error || (!loading && !current);
  const action = current ? paymentAction(current, plan) : "purchase";
  const needsSchedule =
    action === "downgrade" &&
    current?.scheduledDowngrade?.planCode !== plan.code;
  const open = history.data?.items.find(isUnfinishedPayment);
  const wrongFamily = Boolean(
    current?.plan && current.plan.audience !== plan.audience,
  );
  const seatsExceeded = Boolean(
    current && current.members.count > plan.memberLimit,
  );
  const renewalBlocked =
    action === "renew" && Boolean(current?.scheduledDowngrade);
  const blockReason = wrongFamily
    ? "Gói này không phù hợp với loại không gian hiện tại. Hãy chọn gói cùng loại."
    : seatsExceeded
      ? `Giảm số thành viên xuống tối đa ${plan.memberLimit} người trước khi chọn gói này.`
      : renewalBlocked
        ? "Đang có lịch hạ gói. Hủy lịch trong trang quản lý gói trước khi gia hạn gói hiện tại."
        : null;

  async function checkout() {
    if (lock.current || loading || loadError || blockReason || open || !current)
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
        const order = await paymentsApi.create(
          orgId,
          { planCode: plan.code, action },
          key.current,
        );
        await history.refetch();
        const target =
          !order.fulfilledAt &&
          !order.paidAt &&
          safeCheckoutUrl(order.checkoutUrl);
        window.location.assign(
          target || `/thanh-toan/ket-qua?orderCode=${order.orderCode}`,
        );
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Chưa tạo được thanh toán.",
      );
      await history.refetch();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const reload = () => Promise.all([subscription.refetch(), history.refetch()]);
  return {
    loading,
    loadError,
    action,
    needsSchedule,
    open,
    blockReason,
    busy,
    error,
    checkout,
    reload,
  };
}
