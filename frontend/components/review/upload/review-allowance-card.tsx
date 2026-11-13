"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useReviewAllowance } from "@/hooks/review/use-review-allowance";

export function ReviewAllowanceCard({ orgId, role }: { orgId?: string; role?: string }) {
  const query = useReviewAllowance(orgId);
  if (!orgId) return null;
  const quota = query.data?.analysis;
  const inactive = Boolean(query.data && query.data.status !== "active");
  const blocked = Boolean(quota && (quota.available === 0 || inactive));
  const canManagePlan = role === "owner" || role === "user";
  const usedShare = quota && quota.limit > 0 ? Math.min(100, ((quota.used + quota.reserved) / quota.limit) * 100) : 0;
  return (
    <Card role="region" aria-label="Hạn mức rà soát AI" className={`gap-0 p-4 ${blocked ? "border-amber-200 bg-amber-50" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 text-ui-meta font-semibold uppercase tracking-wide text-muted-foreground">Hạn mức rà soát AI</h2>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Cập nhật hạn mức"
          title="Cập nhật hạn mức"
          disabled={query.isFetching}
          onClick={() => { void query.refetch(); }}
          className="text-muted-foreground"
        >
          <RefreshCw aria-hidden="true" className={query.isFetching ? "animate-spin motion-reduce:animate-none" : ""} />
        </Button>
      </div>
      {quota ? (
        <>
          <p className="mb-0 mt-2 text-ui text-muted-foreground">
            Còn <strong className="text-2xl font-bold tabular-nums text-foreground">{quota.available}</strong>
            <span className="tabular-nums"> / {quota.limit} lượt</span>
          </p>
          <Progress aria-label="Tỷ lệ lượt đã dùng" value={usedShare} className={`mt-2 h-1.5 ${blocked ? "bg-amber-100 *:data-[slot=progress-indicator]:bg-amber-500" : ""}`} />
          <p className="mb-0 mt-2 text-ui-meta text-muted-foreground">
            Đã dùng {quota.used}{quota.reserved ? ` · ${quota.reserved} đang xử lý` : ""} · 1 lượt cho mỗi 5 trang
          </p>
          {blocked && (
            <p className="mb-0 mt-3 text-ui-meta leading-5 text-amber-950">
              {inactive ? "Chưa có gói AI đang hoạt động." : "Đã hết lượt rà soát."} Bạn vẫn tải lên và lưu hợp đồng được; cần thêm lượt để AI phân tích.
            </p>
          )}
          {blocked && (canManagePlan
            ? <Link href="/goi-dich-vu" className="mt-2 inline-block text-ui-meta font-semibold text-primary hover:underline">Xem gói dịch vụ</Link>
            : <p className="mb-0 mt-2 text-ui-meta text-amber-950">Liên hệ Chủ tổ chức để kiểm tra hạn mức.</p>)}
        </>
      ) : (
        <p className="mb-0 mt-2 text-ui-meta text-muted-foreground">
          {query.isPending ? "Đang tải hạn mức…" : "Chưa tải được hạn mức. Hệ thống sẽ kiểm tra khi bạn bắt đầu rà soát."}
        </p>
      )}
    </Card>
  );
}
