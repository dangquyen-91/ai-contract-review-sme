"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { paymentsApi } from "@/lib/api/payments";
import { safeCheckoutUrl } from "@/lib/subscription/payment-state";

export function ContractReviewPayment({
  contractId,
  accountId,
  disabled,
  onPrepare,
}: {
  contractId: string;
  accountId: string;
  disabled: boolean;
  onPrepare: () => Promise<void>;
}) {
  const query = useQuery({
    queryKey: ["contract-review-payment", accountId, contractId],
    queryFn: () => paymentsApi.reviewQuote(contractId),
    retry: false,
    staleTime: 0,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const key = useRef<{ fingerprint: string; value: string } | null>(null);
  const quote = query.data;
  async function checkout() {
    if (!quote || !quote.canPurchase || lock.current || disabled) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await onPrepare();
      const fingerprint = `${quote.versionId}:${quote.amount}`;
      if (key.current?.fingerprint !== fingerprint)
        key.current = { fingerprint, value: crypto.randomUUID() };
      const order = await paymentsApi.createReview(
        accountId,
        quote,
        key.current.value,
      );
      window.location.assign(
        (!order.paidAt &&
          !order.fulfilledAt &&
          safeCheckoutUrl(order.checkoutUrl)) ||
          `/thanh-toan/ket-qua?orderCode=${order.orderCode}`,
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Chưa tạo được thanh toán.",
      );
      await query.refetch();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (query.isPending)
    return (
      <p role="status" className="mb-4 text-sm text-muted-foreground">
        Đang kiểm tra lựa chọn thanh toán…
      </p>
    );
  if (query.error)
    return (
      <div role="alert" className="mb-4 text-sm text-destructive">
        Chưa kiểm tra được phí hợp đồng.{" "}
        <Button type="button" variant="link" onClick={() => query.refetch()}>
          Thử lại
        </Button>
      </div>
    );
  if (!quote) return null;
  if (quote.purchaseStatus)
    return (
      <p className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
        {quote.purchaseStatus === "available"
          ? "Phiên bản này đã thanh toán. Bấm Bắt đầu rà soát; lượt trong gói được giữ nguyên."
          : quote.purchaseStatus === "reserved"
            ? "Lần rà soát đã thanh toán đang được xử lý."
            : "Phiên bản này đã có kết quả rà soát được thanh toán."}
      </p>
    );
  if (!quote.canPurchase) return null;
  return (
    <section
      aria-label="Thanh toán riêng cho hợp đồng"
      className="mb-4 space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-sm"
    >
      <p className="font-semibold">
        Không đủ lượt trong gói? Thanh toán hợp đồng này
      </p>
      <p>
        {quote.pageCount} trang · {quote.units} ×{" "}
        {quote.unitPrice.toLocaleString("vi-VN")}đ / 5 trang ={" "}
        <strong>{quote.amount.toLocaleString("vi-VN")}đ</strong>
      </p>
      <p className="text-xs leading-5 text-muted-foreground">
        Giữ nguyên {quote.availableUnits} lượt còn lại. Một lần rà soát thành
        công cho đúng phiên bản này; AI lỗi hoặc hủy được thử lại miễn phí. Chat
        dùng hạn mức gói hiện tại.
      </p>
      {quote.openOrderCode ? (
        <Button asChild variant="outline">
          <Link href={`/thanh-toan/ket-qua?orderCode=${quote.openOrderCode}`}>
            Kiểm tra đơn #{quote.openOrderCode} đang chờ
          </Link>
        </Button>
      ) : (
        <Button type="button" onClick={checkout} disabled={busy || disabled}>
          {busy
            ? "Đang tạo thanh toán…"
            : `Thanh toán ${quote.amount.toLocaleString("vi-VN")}đ`}
        </Button>
      )}
      <Link
        href="/goi-dich-vu/xac-nhan?plan=personal_pro"
        className="block font-medium text-blue-700"
      >
        Hoặc xem gói Personal Pro
      </Link>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
