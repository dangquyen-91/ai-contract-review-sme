import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  isUnfinishedPayment,
  paymentMessage,
  safeCheckoutUrl,
} from "@/lib/payment-state";
import { formatMoney } from "@/lib/subscription-plans";
import type { PaymentAction, PaymentOrder } from "@/types/payment";
import type { PlanCode } from "@/types/subscription";

const planNames: Record<PlanCode, string> = {
  personal_free: "Personal Free",
  personal_pro: "Personal Pro",
  business_starter: "Business Starter",
  business_pro: "Business Pro",
};
const actionNames: Record<PaymentAction, string> = {
  purchase: "Mua gói",
  renew: "Gia hạn",
  upgrade: "Nâng cấp",
  downgrade: "Hạ gói",
};

function orderBadge(order: PaymentOrder) {
  if (order.fulfilledAt)
    return {
      label: "Đã thanh toán",
      color: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    };
  if (order.paidAt || order.status === "paid")
    return {
      label: "Đang kích hoạt",
      color: "bg-amber-50 text-amber-700 ring-amber-600/10",
    };
  if (order.providerError?.includes("Partial payment"))
    return {
      label: "Cần kiểm tra",
      color: "bg-amber-50 text-amber-700 ring-amber-600/10",
    };
  if (order.status === "cancelled")
    return {
      label: "Đã hủy",
      color: "bg-slate-100 text-slate-500 ring-slate-500/10",
    };
  if (order.status === "expired")
    return {
      label: "Đã hết hạn",
      color: "bg-slate-100 text-slate-500 ring-slate-500/10",
    };
  if (order.status === "failed")
    return {
      label: "Chưa thành công",
      color: "bg-red-50 text-red-700 ring-red-600/10",
    };
  return {
    label: "Chờ thanh toán",
    color: "bg-blue-50 text-blue-700 ring-blue-600/10",
  };
}

export function PaymentOrderCard({
  order,
  pending,
  onAction,
}: {
  order: PaymentOrder;
  pending: boolean;
  onAction: (code: number, kind: "sync" | "cancel") => Promise<void>;
}) {
  const message = paymentMessage(order);
  const badge = orderBadge(order);
  const checkoutUrl = safeCheckoutUrl(order.checkoutUrl);
  const unfinished = isUnfinishedPayment(order);
  const paidDate = order.paidAt && new Date(order.paidAt);
  const date =
    paidDate && Number.isFinite(paidDate.getTime())
      ? paidDate.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
      : null;

  return (
    <article
      data-order-status={order.status}
      data-order-fulfilled={Boolean(order.fulfilledAt)}
      className="px-5 py-4 sm:px-6 sm:py-5"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="hidden size-10 shrink-0 items-center justify-center rounded-xl border border-[#e8edf5] bg-[#f8fafd] text-[#8ca1bd] sm:flex">
            <Icon name="document" className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold tracking-[-0.1px] text-[#253650]">
              Đơn #{order.orderCode}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[#8a98ad]">
              {planNames[order.planCode]}{" "}
              <span className="mx-1.5 text-[#c3cddd]">·</span>{" "}
              {actionNames[order.action]}
              {date && (
                <>
                  {" "}
                  <span className="mx-1.5 text-[#c3cddd]">·</span> {date}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end sm:gap-5">
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:gap-1.5">
            <span className="text-[13px] font-semibold tabular-nums text-[#253650]">
              {formatMoney(order.amount)}
            </span>
            <span
              className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${badge.color}`}
            >
              {badge.label}
            </span>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 rounded-lg px-2 text-[11px] text-[#7488a5] shadow-none hover:bg-[#f2f6fd] hover:text-[#0066ff]"
          >
            <Link
              href={`/thanh-toan/ket-qua?orderCode=${order.orderCode}`}
              aria-label={`Chi tiết đơn ${order.orderCode}`}
            >
              Chi tiết <Icon name="diagonal" className="size-3" />
            </Link>
          </Button>
        </div>
      </div>
      {unfinished && (
        <div className="mt-3 flex flex-col justify-between gap-3 rounded-lg bg-[#f7f9fd] px-3 py-3 lg:flex-row lg:items-center">
          <p className="max-w-lg text-[11px] leading-5 text-[#7b89a0]">
            {message.detail}
          </p>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg bg-white px-2.5 text-[11px] shadow-none"
              disabled={pending}
              onClick={() => onAction(order.orderCode, "sync")}
            >
              Kiểm tra lại
            </Button>
            {!order.paidAt && checkoutUrl && (
              <Button
                asChild
                size="sm"
                className="h-8 rounded-lg px-2.5 text-[11px]"
              >
                <a href={checkoutUrl}>Tiếp tục thanh toán</a>
              </Button>
            )}
            {!order.paidAt && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg px-2.5 text-[11px] text-[#8a98ad]"
                disabled={pending}
                onClick={() => onAction(order.orderCode, "cancel")}
              >
                Hủy đơn
              </Button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
