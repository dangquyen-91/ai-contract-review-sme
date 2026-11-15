"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Info } from "lucide-react";
import type { useReviewAllowance } from "@/hooks/review/use-review-allowance";
import type { DashboardContract } from "@/types/contracts";

type Allowance = ReturnType<typeof useReviewAllowance>["data"];

const unitHint = "1 lượt cho mỗi 5 trang, làm tròn lên. Lượt chỉ bị trừ khi rà soát hoàn tất; lỗi hoặc dừng giữa chừng sẽ được hoàn lại.";

function Box({ tone, children }: { tone: "neutral" | "info" | "warning"; children: ReactNode }) {
  const tones = {
    neutral: "border-border bg-muted/40 text-card-foreground",
    info: "border-blue-200 bg-blue-50 text-blue-900",
    warning: "border-amber-200 bg-amber-50 text-amber-950",
  };
  return <div role="status" className={`mb-4 rounded-lg border px-3.5 py-3 text-ui leading-6 ${tones[tone]}`}>{children}</div>;
}

export function ReviewCostLine({ billing, allowance, blocked, role, showPlanLink = true }: {
  billing?: DashboardContract["reviewBilling"];
  allowance: Allowance;
  blocked: boolean;
  role?: string;
  showPlanLink?: boolean;
}) {
  const quota = allowance?.analysis;
  const inactive = Boolean(allowance && allowance.status !== "active");
  const canManagePlan = role === "owner" || role === "user";

  if (billing?.purchaseStatus === "available") {
    return <Box tone="info">Hợp đồng này đã được thanh toán riêng. Lần rà soát này không trừ lượt trong gói.</Box>;
  }
  if (billing?.purchaseStatus === "consumed") {
    return <Box tone="info">Phiên bản này đã có kết quả rà soát. Bạn có thể xem lại báo cáo miễn phí.</Box>;
  }
  if (billing && !billing.ready) {
    return <Box tone="warning">{billing.reason}</Box>;
  }

  return (
    <Box tone={blocked ? "warning" : "neutral"}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          {billing ? (
            <span>
              {billing.pageCount} trang · cần <strong className="tabular-nums">{billing.units} lượt</strong> rà soát
            </span>
          ) : (
            <span>Hạn mức rà soát AI</span>
          )}
          <span title={unitHint} aria-label={unitHint} className="inline-flex text-muted-foreground">
            <Info aria-hidden="true" className="size-3.5" />
          </span>
        </span>
        <span className="text-ui-meta text-muted-foreground">
          {quota ? <>Còn <strong className="tabular-nums text-card-foreground">{quota.available}/{quota.limit}</strong> lượt</> : "Đang tải hạn mức…"}
        </span>
      </div>
      {blocked && (
        <p className="mb-0 mt-1.5 text-ui-meta leading-5">
          {inactive ? "Chưa có gói AI đang hoạt động." : "Chưa đủ lượt để rà soát hợp đồng này."}{" "}
          {!showPlanLink ? "Bạn có thể thanh toán riêng cho hợp đồng này bên dưới." : canManagePlan
            ? <Link href="/goi-dich-vu" className="font-semibold text-primary hover:underline">Xem gói dịch vụ</Link>
            : "Liên hệ Chủ tổ chức để kiểm tra hạn mức."}
        </p>
      )}
    </Box>
  );
}
