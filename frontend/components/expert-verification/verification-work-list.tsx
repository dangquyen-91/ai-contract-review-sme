"use client";

import Link from "next/link";
import { VerificationWorkspaceLink } from "./verification-workspace-link";
import { ArrowRight, ClipboardCheck, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { contractTypeLabels } from "@/config/contract-display";
import { verificationDate } from "@/lib/review/verification-display";
import {
  VerificationDataError,
  VerificationEmptyState,
  VerificationListSkeleton,
  VerificationUpdatedAt,
} from "./verification-data-state";
import type { VerificationQueueItem } from "@/types/verification-workspace";
import type { ReactNode } from "react";

export function VerificationWorkList({
  kind,
  items,
  pending,
  error,
  refreshing,
  onRetry,
  title,
  description,
  controls,
  updatedAt,
}: {
  kind: "assigned" | "waiting";
  items?: VerificationQueueItem[];
  pending: boolean;
  error: unknown;
  refreshing: boolean;
  onRetry: () => void;
  title?: string;
  description?: string;
  controls?: ReactNode;
  updatedAt?: number;
}) {
  const assigned = kind === "assigned";
  const href = `/expert-verification?status=${assigned ? "in_progress" : "requested"}`;
  const Icon = assigned ? ClipboardCheck : Inbox;
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="m-0 text-ui-section font-semibold">
              {title ??
                (assigned ? "Cần tiếp tục xử lý" : "Đang chờ tiếp nhận")}
            </h2>
            <p className="mb-0 mt-1 text-ui-meta text-muted-foreground">
              {description ??
                (assigned
                  ? "Ưu tiên hoàn tất các yêu cầu bạn đã nhận."
                  : "Xem trước hợp đồng trước khi nhận thêm việc.")}
            </p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={href}>
            {assigned ? "Xem tất cả" : "Xem hàng đợi"}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </header>
      {controls && (
        <div className="border-b border-border px-4 py-3 sm:px-5">
          {controls}
        </div>
      )}
      {Boolean(error) && (
        <VerificationDataError
          error={error}
          stale={Boolean(items)}
          refreshing={refreshing}
          onRetry={onRetry}
        />
      )}
      {pending ? (
        <VerificationListSkeleton rows={2} />
      ) : items?.length ? (
        <ul className="m-0 list-none divide-y divide-border p-0">
          {items.slice(0, 5).map((item) => (
            <li
              key={item._id}
              data-verification-row={item._id}
              className="flex flex-col items-start justify-between gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <h3 className="m-0 break-words text-ui font-semibold [overflow-wrap:anywhere]">
                  {item.contractId?.title || "Hợp đồng không còn khả dụng"}
                </h3>
                <p className="mb-0 mt-1 text-ui-meta text-muted-foreground">
                  {contractTypeLabels[item.contractId?.type ?? ""] ??
                    "Chưa xác định loại"}
                </p>
                <p className="mb-0 mt-1 text-ui-meta text-muted-foreground">
                  {assigned && item.assignedAt
                    ? "Nhận " + verificationDate(item.assignedAt)
                    : "Gửi " + verificationDate(item.requestedAt)}
                </p>
              </div>
              {item.contractId ? (
                <Button
                  asChild
                  size="sm"
                  variant={assigned ? "default" : "outline"}
                >
                  <VerificationWorkspaceLink
                    href={`/expert-verification/${item.reviewId}`}
                  >
                    {assigned ? "Tiếp tục kiểm tra" : "Xem yêu cầu"}
                    <ArrowRight aria-hidden="true" />
                  </VerificationWorkspaceLink>
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled>
                  Không khả dụng
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        !error && (
          <VerificationEmptyState
            title={
              assigned
                ? "Bạn chưa có yêu cầu đang xử lý"
                : "Chưa có yêu cầu chờ tiếp nhận"
            }
            description={
              assigned
                ? "Chọn một yêu cầu trong hàng đợi để bắt đầu xác minh."
                : "Yêu cầu mới sẽ tự xuất hiện khi có người gửi."
            }
          />
        )
      )}
      <footer className="border-t border-border px-4 py-3">
        <VerificationUpdatedAt
          time={updatedAt}
          refreshing={refreshing}
          stale={Boolean(error)}
        />
      </footer>
    </section>
  );
}
