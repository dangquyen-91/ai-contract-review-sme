"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { usePaymentCheckout } from "@/hooks/subscription/use-payment-checkout";
import { formatMoney } from "@/lib/subscription/subscription-plans";
import type { PaymentAction } from "@/types/payment";
import type { SubscriptionPlan } from "@/types/subscription";

const policies: Record<PaymentAction, string> = {
  upgrade:
    "Gói mới bắt đầu ngay khi thanh toán được xác nhận và kéo dài một tháng. Phần chưa dùng của gói hiện tại (kể cả kỳ đã gia hạn trước) được trừ vào giá; lượt mua thêm chưa dùng được chuyển sang gói mới.",
  renew:
    "Kỳ mới nối tiếp ngay sau kỳ hiện tại. Có thể gia hạn trong 7 ngày cuối kỳ hoặc trong 3 ngày sau khi hết hạn; không tự động trừ tiền.",
  downgrade:
    "Gói thấp hơn được chọn cho kỳ tới và có hiệu lực khi kỳ hiện tại kết thúc. Bạn thanh toán gói này khi gia hạn và có thể hủy lịch trước đó.",
  purchase:
    "Gói có thời hạn một tháng kể từ khi thanh toán được xác nhận. Hạn mức không cộng dồn sang kỳ sau.",
};
const actionLabels: Record<PaymentAction, string> = {
  purchase: "Thanh toán",
  renew: "Gia hạn",
  upgrade: "Nâng cấp",
  downgrade: "Gia hạn",
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

  const quote = checkout.quote;
  const amount = quote?.amount ?? plan.price;
  const label = checkout.needsSchedule
    ? "Chọn gói này cho kỳ tới"
    : `${actionLabels[checkout.action]} ${formatMoney(amount)}`;
  // Not yet in the renewal window is an expected state, not an error.
  const waitingForWindow = quote?.blockCode === "RENEWAL_NOT_OPEN";

  return (
    <div className="mt-5">
      <p className="rounded-r-lg border-l-2 border-[#8db6ff] bg-[#f3f7ff] px-3.5 py-3 text-[12px] leading-[1.7] text-[#526581]">
        {policies[checkout.action]}
      </p>
      {quote && quote.credit > 0 && (
        <dl className="mt-3 grid gap-1 rounded-lg border border-border px-3.5 py-3 text-[13px]">
          <div className="flex justify-between gap-3">
            <dt>Giá {plan.name}</dt>
            <dd className="tabular-nums">{formatMoney(quote.listPrice)}</dd>
          </div>
          <div className="flex justify-between gap-3 text-emerald-700">
            <dt>Trừ phần chưa dùng của gói hiện tại</dt>
            <dd className="tabular-nums">−{formatMoney(quote.credit)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-border pt-1 font-semibold">
            <dt>Thanh toán</dt>
            <dd className="tabular-nums">{formatMoney(amount)}</dd>
          </div>
        </dl>
      )}
      {checkout.blockReason && (
        <p
          role={waitingForWindow ? "status" : "alert"}
          className={`mt-3 text-sm ${waitingForWindow ? "text-[#526581]" : "text-red-700"}`}
        >
          {checkout.blockReason}
        </p>
      )}
      {!checkout.open && checkout.replaces && (
        <p role="status" className="mt-3 text-[12px] text-[#61708b]">
          Đơn #{checkout.replaces.orderCode} chưa thanh toán sẽ được hủy khi bạn tạo đơn mới.
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
