"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { usePaymentCheckout } from "@/hooks/subscription/use-payment-checkout";
import { formatMoney } from "@/lib/subscription/subscription-plans";
import type { PaymentAction } from "@/types/payment";
import type { SubscriptionPlan } from "@/types/subscription";

const policies: Record<PaymentAction, string> = {
  upgrade:
    "Thu đủ giá gói mới và bắt đầu kỳ mới ngay sau thanh toán. Không bảo lưu thời gian và quyền lợi gói cũ.",
  renew:
    "Kỳ mới nối tiếp sau các kỳ đã thanh toán. Không tự động trừ tiền ở kỳ tiếp theo.",
  downgrade:
    "Áp dụng từ kỳ tiếp theo sau các kỳ đã thanh toán. Số thành viên phải phù hợp trước khi đặt lịch.",
  purchase:
    "Gói có thời hạn một tháng kể từ khi thanh toán được xác nhận. Hạn mức không cộng dồn sang kỳ sau.",
};
const actionLabels: Record<PaymentAction, string> = {
  purchase: "Thanh toán",
  renew: "Gia hạn",
  upgrade: "Nâng cấp",
  downgrade: "Thanh toán kỳ hạ gói",
};

export function WorkspaceCheckout({
  orgId,
  plan,
}: {
  orgId: string;
  plan: SubscriptionPlan;
}) {
  const checkout = usePaymentCheckout(orgId, plan);
  if (checkout.loading)
    return (
      <p role="status" className="mt-6 text-sm">
        Đang kiểm tra gói và đơn thanh toán…
      </p>
    );
  if (checkout.loadError)
    return (
      <div role="alert" className="mt-6 text-sm">
        <p>Chưa kiểm tra được thông tin thanh toán. Vui lòng thử lại.</p>
        <Button variant="outline" onClick={() => void checkout.reload()}>
          Thử lại
        </Button>
      </div>
    );

  const label = checkout.needsSchedule
    ? "Đặt lịch hạ gói trước khi thanh toán"
    : `${actionLabels[checkout.action]} ${formatMoney(plan.price)}`;

  return (
    <div className="mt-5">
      <p className="rounded-r-lg border-l-2 border-[#8db6ff] bg-[#f3f7ff] px-3.5 py-3 text-[12px] leading-[1.7] text-[#526581]">
        {policies[checkout.action]}
      </p>
      {checkout.blockReason && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {checkout.blockReason}
        </p>
      )}
      {checkout.open ? (
        <p role="status" className="mt-4 text-sm text-[#61708b]">
          Bạn có đơn #{checkout.open.orderCode} chưa hoàn tất. Tiếp tục hoặc
          kiểm tra đơn trong lịch sử bên dưới trước khi tạo đơn mới.
        </p>
      ) : (
        <Button
          className="mt-5 min-h-12 w-full rounded-xl text-[14px]"
          data-checkout-submit
          disabled={checkout.busy || Boolean(checkout.blockReason)}
          onClick={checkout.checkout}
        >
          {checkout.busy ? "Đang xử lý…" : label}
        </Button>
      )}
      {checkout.error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {checkout.error}
        </p>
      )}
      <div className="mt-3 flex items-start justify-center gap-2 text-[11px] leading-5 text-[#7b89a0]">
        <Icon name="lock" className="mt-0.5 size-3.5 shrink-0" />
        <p>
          Thanh toán bảo mật qua payOS. Quyền lợi được cập nhật sau khi giao
          dịch được xác nhận.
        </p>
      </div>
    </div>
  );
}
