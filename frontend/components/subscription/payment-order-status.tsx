"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePaymentResult } from "@/hooks/subscription/use-payment-result";
import {
  paymentMessage,
  safeCheckoutUrl,
} from "@/lib/subscription/payment-state";
import { workspacePath } from "@/lib/routing/workspace-path";
import { PaymentOrderDetails } from "./payment-order-details";
import type { AuthUser } from "@/types/auth";

export function PaymentOrderStatus({
  user,
  orgId,
  orderCode,
  cancelled,
}: {
  user: AuthUser;
  orgId: string;
  orderCode: number;
  cancelled: boolean;
}) {
  const { query, order, pending, error, check } = usePaymentResult(
    orgId,
    orderCode,
  );
  const message = order && paymentMessage(order);
  const checkoutUrl =
    order &&
    !order.paidAt &&
    !order.fulfilledAt &&
    ["creating", "pending"].includes(order.status)
      ? safeCheckoutUrl(order.checkoutUrl)
      : null;

  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-[#dce4ef] bg-white p-6 text-[#080e2f] sm:p-9">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#0066ff]">
        Thanh toán LawScan
      </p>
      {query.isPending ? (
        <h1 role="status" className="mt-4 text-2xl font-semibold">
          Đang kiểm tra giao dịch…
        </h1>
      ) : query.error ? (
        <div role="alert">
          <h1 className="mt-4 text-2xl font-semibold">
            Chưa xem được giao dịch
          </h1>
          <p className="mt-3 text-sm leading-6">
            {query.error.message} Hãy dùng đúng tài khoản tạo đơn. Không chuyển
            khoản lại khi chưa kiểm tra.
          </p>
          <Button
            className="mt-4"
            disabled={query.isFetching}
            onClick={() => query.refetch()}
          >
            Tải lại thông tin
          </Button>
        </div>
      ) : (
        order &&
        message && (
          <>
            <h1
              role="status"
              className={`mt-4 text-2xl font-semibold ${message.success ? "text-emerald-700" : ""}`}
            >
              {message.title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#61708b]">
              {message.detail}
            </p>
            {cancelled && !order.fulfilledAt && (
              <p className="mt-3 text-sm text-[#61708b]">
                Bạn đã quay lại từ trang thanh toán. Trạng thái đơn được xác
                nhận với payOS trước khi hiển thị.
              </p>
            )}
            <PaymentOrderDetails order={order} email={user.email} />
            <div className="mt-6 flex flex-wrap gap-3">
              {order.purpose === "contract_review" &&
                order.fulfilledAt &&
                order.contractId && (
                  <Button asChild>
                    <Link href={`/contract/${order.contractId}`}>
                      Mở hợp đồng để rà soát
                    </Link>
                  </Button>
                )}
              {!order.fulfilledAt && (
                <Button disabled={pending} onClick={check}>
                  {pending ? "Đang kiểm tra…" : "Kiểm tra lại trạng thái"}
                </Button>
              )}
              {checkoutUrl && (
                <Button asChild variant="outline">
                  <a href={checkoutUrl}>Tiếp tục thanh toán</a>
                </Button>
              )}
            </div>
          </>
        )
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={workspacePath(user)}>Về tài khoản</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/goi-dich-vu">Xem gói dịch vụ</Link>
        </Button>
      </div>
    </section>
  );
}
