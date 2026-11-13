"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { useReviewAllowance } from "@/hooks/review/use-review-allowance";
import type { DashboardContract } from "@/types/contracts";

type Allowance = ReturnType<typeof useReviewAllowance>["data"];

const unitHint = "1 lượt cho mỗi 5 trang, làm tròn lên. Lượt chỉ bị trừ khi rà soát hoàn tất; lỗi hoặc dừng giữa chừng sẽ được hoàn lại.";

function Box({ tone, children }: { tone: "neutral" | "info" | "warning"; children: ReactNode }) {
  return (
    <Alert role="status" variant={tone === "neutral" ? "default" : tone} className={`mb-4 text-ui ${tone === "neutral" ? "bg-muted/40" : ""}`}>
      <AlertDescription className="text-ui leading-6 text-inherit">{children}</AlertDescription>
    </Alert>
  );
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
      <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          {billing ? (
            <span>
              {billing.pageCount} trang · cần <strong className="tabular-nums">{billing.units} lượt</strong> rà soát
            </span>
          ) : (
            <span>Hạn mức rà soát AI</span>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label={unitHint} className="inline-flex rounded-full text-muted-foreground hover:text-foreground">
                <Info aria-hidden="true" className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">{unitHint}</TooltipContent>
          </Tooltip>
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
