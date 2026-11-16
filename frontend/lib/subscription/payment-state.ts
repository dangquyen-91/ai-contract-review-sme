import type { PaymentOrder, PaymentAction } from "@/types/payment";
import type {
  OrganizationSubscription,
  SubscriptionPlan,
} from "@/types/subscription";

export function paymentAction(
  current: OrganizationSubscription,
  target: SubscriptionPlan,
): PaymentAction {
  if (current.scheduledDowngrade?.planCode === target.code) return "downgrade";
  if (current.status !== "active" || !current.plan || current.plan.price === 0)
    return "purchase";
  if (target.price > current.plan.price) return "upgrade";
  if (target.code === current.plan.code) return "renew";
  return "downgrade";
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

export function paymentMessage(order: PaymentOrder) {
  if (order.fulfilledAt && order.purpose === "contract_review")
    return {
      title: "Thanh toán thành công",
      detail:
        "Bạn đã mua quyền rà soát phiên bản hợp đồng này. Lượt trong gói được giữ nguyên; nếu AI lỗi hoặc bị hủy, bạn có thể thử lại mà không trả thêm tiền.",
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
