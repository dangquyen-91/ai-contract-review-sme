import type { PaymentOrder, PaymentAction } from "@/types/payment";
import type {
  OrganizationSubscription,
  SubscriptionPlan,
} from "@/types/subscription";

export function paymentAction(
  current: OrganizationSubscription,
  target: SubscriptionPlan,
): PaymentAction {
  // The plan chosen for the next period is paid as the renewal.
  if (current.scheduledDowngrade?.planCode === target.code) return "renew";
  if (current.status !== "active" || !current.plan || current.plan.price === 0)
    return "purchase";
  if (target.price > current.plan.price) return "upgrade";
  if (target.code === current.plan.code) return "renew";
  return "downgrade";
}

/**
 * An unpaid order with a confirmed payOS link is cancelled by the server when a new
 * checkout starts, so it does not block one. Anything else unfinished does.
 */
export function isReplaceablePayment(order: PaymentOrder) {
  return (
    !order.fulfilledAt &&
    !order.paidAt &&
    !order.providerError &&
    order.status === "pending" &&
    Boolean(order.checkoutUrl)
  );
}

export function blocksNewCheckout(order: PaymentOrder) {
  return isUnfinishedPayment(order) && !isReplaceablePayment(order);
}

export function isUnfinishedPayment(order: PaymentOrder) {
  return (
    (!order.fulfilledAt &&
      !["cancelled", "expired", "failed"].includes(order.status)) ||
    Boolean(
      !order.fulfilledAt && order.providerError?.includes("Partial payment"),
    )
  );
}

export function topUpKindLabel(order: Pick<PaymentOrder, "topUpKind">) {
  return order.topUpKind === "analysis"
    ? "rà soát"
    : order.topUpKind === "chat"
      ? "chat"
      : "soạn AI";
}

export function paymentMessage(order: PaymentOrder) {
  if (order.fulfilledAt && order.purpose === "contract_review")
    return {
      title: "Thanh toán thành công",
      detail:
        "Bạn đã mua phần lượt còn thiếu để rà soát phiên bản hợp đồng này. Nếu AI lỗi hoặc bị hủy, các lượt được hoàn lại và bạn có thể thử lại mà không trả thêm tiền.",
      success: true,
    };
  if (order.fulfilledAt && order.purpose === "top_up")
    return {
      title: "Thanh toán thành công",
      detail: `Đã cộng ${order.topUpUnits ?? ""} lượt ${topUpKindLabel(order)} vào kỳ hiện tại. Bạn có thể dùng ngay; lượt mua thêm hết hạn cùng kỳ.`,
      success: true,
    };
  if (order.fulfilledAt)
    return {
      title: "Thanh toán thành công",
      detail:
        "Thanh toán đã được xác nhận và quyền lợi của kỳ đã thanh toán đã được ghi nhận. Gói gia hạn hoặc hạ cấp sẽ có hiệu lực theo lịch.",
      success: true,
    };
  if (order.paidAt || order.status === "paid")
    return {
      title: "Đã nhận tiền, đang hoàn tất kích hoạt",
      detail:
        "Không thanh toán thêm. Hãy kiểm tra lại trạng thái; nếu vẫn chưa hoàn tất, liên hệ hỗ trợ kèm mã đơn.",
      success: false,
    };
  if (order.providerError?.includes("Partial payment"))
    return {
      title: "Giao dịch cần kiểm tra",
      detail:
        "Đã ghi nhận một phần tiền thanh toán. Liên hệ hỗ trợ kèm mã đơn trước khi thanh toán thêm.",
      success: false,
    };
  if (order.status === "cancelled")
    return {
      title: "Đơn thanh toán đã hủy",
      detail: "Đơn chưa kích hoạt gói. Bạn có thể chọn lại gói dịch vụ.",
      success: false,
    };
  if (order.status === "expired")
    return {
      title: "Đơn thanh toán đã hết hạn",
      detail: "Đơn chưa kích hoạt gói. Bạn có thể tạo đơn mới.",
      success: false,
    };
  if (order.status === "failed")
    return {
      title: "Thanh toán chưa thành công",
      detail: "Đơn chưa kích hoạt gói. Kiểm tra lịch sử trước khi thử lại.",
      success: false,
    };
  return {
    title: "Đang chờ xác nhận thanh toán",
    detail:
      "Quyền lợi chưa được cấp. Nếu bạn đã chuyển khoản, hãy kiểm tra lại trạng thái trước khi thanh toán thêm.",
    success: false,
  };
}

// Only allow the hosted payOS checkout; never navigate to an arbitrary API-supplied URL.
export function safeCheckoutUrl(value: string | null) {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" &&
      url.hostname === "pay.payos.vn" &&
      !url.username &&
      !url.password &&
      !url.port
      ? url.href
      : null;
  } catch {
    return null;
  }
}
