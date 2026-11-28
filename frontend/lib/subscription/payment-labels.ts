import type { PaymentAction, PaymentOrder } from "@/types/payment";
import type { PlanCode } from "@/types/subscription";
import { topUpKindLabel } from "./payment-state";

export const paymentPlanNames: Record<PlanCode, string> = {
  personal_free: "Personal Free",
  personal_pro: "Personal Pro",
  business_starter: "Business Starter",
  business_pro: "Business Pro",
};

export const paymentActionNames: Record<PaymentAction, string> = {
  purchase: "Mua gói",
  renew: "Gia hạn",
  upgrade: "Nâng cấp",
  downgrade: "Hạ gói",
};

type BadgeSource = Pick<PaymentOrder, "fulfilledAt" | "paidAt" | "status" | "providerError">;

/** How an order reads to people, shared by the owner's history and the Manager list. */
export function paymentStatusBadge(order: BadgeSource) {
  if (order.fulfilledAt)
    return { label: "Đã thanh toán", color: "bg-emerald-50 text-emerald-700 ring-emerald-600/10" };
  if (order.paidAt || order.status === "paid")
    return { label: "Đang kích hoạt", color: "bg-amber-50 text-amber-700 ring-amber-600/10" };
  if (order.providerError?.includes("Partial payment"))
    return { label: "Cần kiểm tra", color: "bg-amber-50 text-amber-700 ring-amber-600/10" };
  if (order.status === "cancelled")
    return { label: "Đã hủy", color: "bg-slate-100 text-slate-500 ring-slate-500/10" };
  if (order.status === "expired")
    return { label: "Đã hết hạn", color: "bg-slate-100 text-slate-500 ring-slate-500/10" };
  if (order.status === "failed")
    return { label: "Chưa thành công", color: "bg-red-50 text-red-700 ring-red-600/10" };
  return { label: "Chờ thanh toán", color: "bg-blue-50 text-blue-700 ring-blue-600/10" };
}

type ItemSource = Pick<PaymentOrder, "purpose" | "planCode" | "action" | "topUpKind" | "topUpUnits" | "reviewUnits">;

/** What the order bought, e.g. "Nâng cấp · Business Pro" or "Mua thêm 50 lượt rà soát". */
export function paymentItemLabel(order: ItemSource) {
  if (order.purpose === "top_up") return `Mua thêm ${order.topUpUnits ?? ""} lượt ${topUpKindLabel(order)}`;
  if (order.purpose === "contract_review") return `Rà soát hợp đồng · ${order.reviewUnits ?? "?"} lượt`;
  const plan = order.planCode ? paymentPlanNames[order.planCode] : "Gói dịch vụ";
  return `${paymentActionNames[order.action]} · ${plan}`;
}
