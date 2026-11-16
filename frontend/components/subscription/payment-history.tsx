"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { usePaymentHistoryWorkflow } from "@/hooks/subscription/use-payment-history-workflow";
import { PaymentOrderCard } from "./payment-order-card";

export function PaymentHistory({ orgId }: { orgId: string }) {
  const { history, page, setPage, pending, error, act } =
    usePaymentHistoryWorkflow(orgId);
  const items = history.data?.items ?? [];
  const showPagination = page > 1 || items.length >= 20;

  return (
    <section
      data-payment-history
      className="overflow-hidden rounded-[20px] border border-[#e0e7f2] bg-white text-[#080e2f]"
      aria-label="Lịch sử thanh toán"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1f7] px-5 py-5 sm:px-6">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.2px]">
            Lịch sử thanh toán
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-[#8a98ad]">
            Theo dõi giao dịch và quản lý các đơn chưa hoàn tất.
          </p>
        </div>
        {!history.isPending && !history.error && items.length > 0 && (
          <span className="text-[11px] text-[#9aa7ba]">
            {items.length} giao dịch trên trang {page}
          </span>
        )}
      </header>
      {history.isPending ? (
        <p role="status" className="px-6 py-8 text-[13px] text-[#8795ab]">
          Đang tải các đơn thanh toán…
        </p>
      ) : history.error ? (
        <div role="alert" className="px-6 py-6 text-sm">
          Không tải được lịch sử.{" "}
          <Button variant="link" onClick={() => history.refetch()}>
            Thử lại
          </Button>
        </div>
      ) : (
        <>
          {!items.length && (
            <div className="flex items-center gap-3.5 px-5 py-7 sm:px-6">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f3f6fb] text-[#a0aec2]">
                <Icon name="document" className="size-5" />
              </span>
              <div>
                <p className="text-[13px] font-medium text-[#61708b]">
                  Chưa có giao dịch
                </p>
                <p className="mt-1 text-[12px] text-[#9aa7ba]">
                  Các đơn thanh toán sẽ được lưu và hiển thị tại đây.
                </p>
              </div>
            </div>
          )}
          <div className="divide-y divide-[#edf1f7]">
            {items.map((order) => (
              <PaymentOrderCard
                key={order.orderCode}
                order={order}
                pending={pending}
                onAction={act}
              />
            ))}
          </div>
          {showPagination && (
            <nav
              aria-label="Phân trang thanh toán"
              className="flex items-center justify-between gap-3 border-t border-[#edf1f7] px-5 py-3 sm:px-6"
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-[11px] text-[#71809a]"
                disabled={pending || history.isFetching || page === 1}
                onClick={() => setPage(page - 1)}
              >
                ← Trang trước
              </Button>
              <span className="whitespace-nowrap text-[11px] text-[#8a98ad]">
                Trang {page}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-[11px] text-[#71809a]"
                disabled={pending || history.isFetching || items.length < 20}
                onClick={() => setPage(page + 1)}
              >
                Trang sau →
              </Button>
            </nav>
          )}
        </>
      )}
      {error && (
        <p
          role="alert"
          className="border-t border-red-100 bg-red-50/40 px-5 py-3 text-[12px] leading-5 text-red-700 sm:px-6"
        >
          {error}
        </p>
      )}
    </section>
  );
}
