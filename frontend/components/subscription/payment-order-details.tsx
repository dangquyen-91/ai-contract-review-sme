import { formatMoney } from "@/lib/subscription/subscription-plans";
import type { PaymentOrder } from "@/types/payment";

export function PaymentOrderDetails({
  order,
  email,
}: {
  order: PaymentOrder;
  email: string;
}) {
  return (
    <dl className="mt-6 grid gap-3 rounded-xl bg-[#f5f8fc] p-4 text-sm">
      <div className="flex flex-wrap justify-between gap-2">
        <dt>Mã đơn</dt>
        <dd className="font-semibold">#{order.orderCode}</dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt>Số tiền</dt>
        <dd className="font-semibold tabular-nums">
          {formatMoney(order.amount)}
        </dd>
      </div>
      <div className="flex flex-wrap justify-between gap-2">
        <dt>Tài khoản</dt>
        <dd className="break-all">{email}</dd>
      </div>
    </dl>
  );
}
