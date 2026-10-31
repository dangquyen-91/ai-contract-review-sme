"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useReviewAllowance } from "@/hooks/review/use-review-allowance";

export function ReviewAllowanceSummary({ orgId, role }: { orgId?: string; role?: string }) {
  const query = useReviewAllowance(orgId);
  if (!orgId) return null;
  const quota = query.data?.analysis;
  const blocked = Boolean(quota && (quota.available === 0 || query.data?.status !== "active"));
  return <section aria-label="Hạn mức rà soát AI" className={`mt-4 rounded-xl border p-4 text-ui leading-6 ${blocked ? "border-amber-200 bg-amber-50 text-amber-950" : "border-border bg-card text-card-foreground"}`}>
    <div className="flex flex-wrap items-center justify-between gap-2"><strong>Hạn mức rà soát AI</strong><Button variant="ghost" size="sm" disabled={query.isFetching} onClick={() => { void query.refetch(); }}>{query.isFetching ? "Đang cập nhật…" : "Cập nhật hạn mức"}</Button></div>
    {quota ? <>
      <p className="mb-0 mt-1">Đã dùng <strong className="tabular-nums">{quota.used}</strong> · Lượt đang xử lý <strong className="tabular-nums">{quota.reserved}</strong> · Còn lại <strong className="tabular-nums">{quota.available}/{quota.limit}</strong></p>
      <p className="mb-0 mt-1 text-ui-meta text-muted-foreground">1 lượt/5 trang, làm tròn lên theo từng tài liệu. Lượt đang xử lý đã được giữ; lỗi hoặc hủy sẽ hoàn lại.</p>
      {blocked && <p className="mb-0 mt-2">{query.data?.status !== "active" ? "Chưa có gói AI đang hoạt động. " : "Đã hết lượt rà soát AI khả dụng. "}Bạn vẫn có thể tải lên và lưu hợp đồng; cần thêm lượt để bắt đầu phân tích.</p>}
      {blocked && ((role === "owner" || role === "user") ? <Link className="mt-2 inline-block font-semibold text-primary hover:underline" href="/goi-dich-vu">Xem gói dịch vụ</Link> : <p className="mb-0 mt-2">Liên hệ Chủ tổ chức để kiểm tra hạn mức.</p>)}
    </> : <p className="mb-0 mt-1 text-muted-foreground">{query.isPending ? "Đang tải hạn mức…" : "Chưa tải được hạn mức. Hệ thống sẽ kiểm tra khi bạn gửi yêu cầu rà soát."}</p>}
  </section>;
}
