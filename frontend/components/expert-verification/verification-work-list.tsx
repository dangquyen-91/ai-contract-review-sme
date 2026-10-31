"use client";

import Link from "next/link";
import { VerificationWorkspaceLink } from "./verification-workspace-link";
import { ArrowRight, ClipboardCheck, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { contractTypeLabels } from "@/config/contract-display";
import { verificationDate } from "@/lib/review/verification-display";
import { verificationErrorMessage } from "@/lib/review/expert-verification";
import type { VerificationQueueItem } from "@/types/verification-workspace";
import type { ReactNode } from "react";

export function VerificationWorkList({ kind, items, pending, error, refreshing, onRetry, title, description, controls }: {
  kind: "assigned" | "waiting";
  items?: VerificationQueueItem[];
  pending: boolean;
  error: unknown;
  refreshing: boolean;
  onRetry: () => void;
  title?: string;
  description?: string;
  controls?: ReactNode;
}) {
  const assigned = kind === "assigned";
  const href = `/expert-verification?status=${assigned ? "in_progress" : "requested"}`;
  const Icon = assigned ? ClipboardCheck : Inbox;
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-primary"><Icon className="size-5" aria-hidden="true" /></span>
          <div>
                <h2 className="m-0 text-ui-section font-semibold">{title ?? (assigned ? "Cần tiếp tục xử lý" : "Đang chờ tiếp nhận")}</h2>
                <p className="mb-0 mt-1 text-ui-meta text-muted-foreground">{description ?? (assigned ? "Ưu tiên hoàn tất các yêu cầu bạn đã nhận." : "Xem trước hợp đồng trước khi nhận thêm việc.")}</p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline"><Link href={href}>{assigned ? "Xem tất cả" : "Xem hàng đợi"}<ArrowRight aria-hidden="true" /></Link></Button>
      </header>
      {controls && <div className="border-b border-border px-4 py-3 sm:px-5">{controls}</div>}
      {Boolean(error) && (
        <div role="alert" className="m-4 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-ui leading-6 text-amber-950">
          <p className="m-0">{verificationErrorMessage(error)}{items && " Các yêu cầu bên dưới là dữ liệu lần tải gần nhất."}</p>
          <Button variant="outline" size="sm" disabled={refreshing} onClick={onRetry}>Thử tải lại</Button>
        </div>
      )}
      {pending ? <p role="status" className="p-6 text-ui text-muted-foreground">Đang tải danh sách yêu cầu…</p> : items?.length ? (
        <ul className="m-0 list-none divide-y divide-border p-0">
          {items.slice(0, 5).map((item) => (
            <li key={item._id} data-verification-row={item._id} className="flex flex-col items-start justify-between gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
              <div className="min-w-0 flex-1">
                <h3 className="m-0 break-words text-ui font-semibold [overflow-wrap:anywhere]">{item.contractId?.title || "Hợp đồng không còn khả dụng"}</h3>
                <p className="mb-0 mt-1 text-ui-meta text-muted-foreground">{contractTypeLabels[item.contractId?.type ?? ""] ?? "Chưa xác định loại"}</p>
                <p className="mb-0 mt-1 text-ui-meta text-muted-foreground">{assigned && item.assignedAt ? "Nhận " + verificationDate(item.assignedAt) : "Gửi " + verificationDate(item.requestedAt)}</p>
              </div>
              {item.contractId ? (
                <Button asChild size="sm" variant={assigned ? "default" : "outline"}>
                  <VerificationWorkspaceLink href={`/expert-verification/${item.reviewId}`}>{assigned ? "Tiếp tục kiểm tra" : "Xem yêu cầu"}<ArrowRight aria-hidden="true" /></VerificationWorkspaceLink>
                </Button>
              ) : <Button size="sm" variant="outline" disabled>Không khả dụng</Button>}
            </li>
          ))}
        </ul>
      ) : !error && (
        <div className="px-5 py-8 text-center">
          <Icon className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <p className="mb-0 mt-3 text-ui font-medium">{assigned ? "Bạn chưa có yêu cầu đang xử lý" : "Chưa có yêu cầu chờ tiếp nhận"}</p>
          <p className="mb-0 mt-2 text-ui-meta text-muted-foreground">{assigned ? "Chọn một yêu cầu trong hàng đợi để bắt đầu xác minh." : "Yêu cầu mới sẽ tự xuất hiện khi có người gửi."}</p>
        </div>
      )}
    </section>
  );
}
