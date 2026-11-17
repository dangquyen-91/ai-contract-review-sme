"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTopUpPacks } from "@/hooks/subscription/use-subscription-plans";
import { usePaymentHistory } from "@/hooks/subscription/use-payments";
import { paymentsApi } from "@/lib/api/payments";
import {
  blocksNewCheckout,
  isReplaceablePayment,
  safeCheckoutUrl,
} from "@/lib/subscription/payment-state";
import { formatMoney, formatPlanNumber } from "@/lib/subscription/subscription-plans";
import type { OrganizationSubscription, TopUpPack, UsageKind } from "@/types/subscription";

export const TOP_UP_SECTION_ID = "mua-them-luot";

const kindLabels: Record<UsageKind, string> = {
  analysis: "Rà soát",
  chat: "Chat",
  drafting: "Soạn AI / kiểm tra điều khoản",
};

export function TopUpPacks({
  orgId,
  current,
}: {
  orgId: string;
  current: OrganizationSubscription;
}) {
  const packs = useTopUpPacks();
  const history = usePaymentHistory(orgId);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const lock = useRef(false);
  // One idempotency key per pack and price, reused for retries of the same intent.
  const keys = useRef(new Map<string, string>());
  const paidPlan = current.status === "active" && Boolean(current.plan && current.plan.price > 0);
  const audience = current.plan?.audience;
  const available = packs.data?.filter((pack) => pack.audience === audience) ?? [];
  const open = history.data?.items.find(blocksNewCheckout);
  const replaces = history.data?.items.find(isReplaceablePayment);

  async function buy(pack: TopUpPack) {
    if (lock.current || open) return;
    lock.current = true;
    setBusy(pack.code);
    setError("");
    try {
      const fingerprint = `${pack.code}:${pack.price}`;
      if (!keys.current.has(fingerprint)) keys.current.set(fingerprint, crypto.randomUUID());
      const order = await paymentsApi.createTopUp(orgId, pack, keys.current.get(fingerprint)!);
      window.location.assign(
        (!order.paidAt && !order.fulfilledAt && safeCheckoutUrl(order.checkoutUrl)) ||
          `/thanh-toan/ket-qua?orderCode=${order.orderCode}`,
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Chưa tạo được thanh toán.");
      void history.refetch();
      void packs.refetch();
    } finally {
      lock.current = false;
      setBusy(null);
    }
  }

  return (
    <section
      id={TOP_UP_SECTION_ID}
      aria-labelledby={`${TOP_UP_SECTION_ID}-title`}
      className="mt-6 scroll-mt-24 rounded-xl border border-border bg-card p-5 text-card-foreground"
    >
      <h2 id={`${TOP_UP_SECTION_ID}-title`} className="text-base font-semibold">
        Mua thêm lượt
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Lượt mua thêm được cộng ngay vào kỳ hiện tại và hết hạn cùng kỳ. Lượt trong gói được dùng
        trước; nếu nâng cấp gói, lượt mua thêm chưa dùng được chuyển sang kỳ mới.
      </p>
      {!paidPlan ? (
        <div className="mt-3 space-y-2 text-sm">
          <p>Mua thêm lượt dành cho tài khoản đang có gói trả phí.</p>
          <Button asChild size="sm">
            <Link href={`/goi-dich-vu?audience=${audience ?? "personal"}`}>Xem gói trả phí</Link>
          </Button>
        </div>
      ) : packs.isPending ? (
        <p className="mt-3 text-sm text-muted-foreground">Đang tải các gói mua thêm…</p>
      ) : packs.error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          Không tải được các gói mua thêm.{" "}
          <Button variant="link" onClick={() => packs.refetch()}>
            Thử lại
          </Button>
        </p>
      ) : (
        <>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {available.map((pack) => (
              <li
                key={pack.code}
                className="flex flex-col justify-between gap-3 rounded-lg border border-border p-4"
              >
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {kindLabels[pack.kind]}
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    +{formatPlanNumber(pack.units)} lượt
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Còn {formatPlanNumber(current[pack.kind].available)} lượt trong kỳ
                  </p>
                </div>
                <Button
                  type="button"
                  disabled={Boolean(open) || busy !== null}
                  onClick={() => void buy(pack)}
                >
                  {busy === pack.code ? "Đang tạo thanh toán…" : `Mua ${formatMoney(pack.price)}`}
                </Button>
              </li>
            ))}
          </ul>
          {!open && replaces && (
            <p className="mt-3 text-sm text-muted-foreground">
              Đơn #{replaces.orderCode} chưa thanh toán sẽ được hủy khi bạn mua gói mới.
            </p>
          )}
          {open && (
            <p className="mt-3 text-sm">
              Đang có đơn #{open.orderCode} chưa hoàn tất.{" "}
              <Link
                className="font-semibold text-primary hover:underline"
                href={`/thanh-toan/ket-qua?orderCode=${open.orderCode}`}
              >
                Kiểm tra đơn
              </Link>
            </p>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
