"use client";

import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { verificationDate } from "@/lib/review/verification-display";
import { verificationErrorMessage } from "@/lib/review/expert-verification";

export function VerificationListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-label="Đang tải danh sách"
      className="space-y-3 p-4"
    >
      <span className="sr-only">Đang tải dữ liệu…</span>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="space-y-3 rounded-xl border border-border p-4"
        >
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="h-8 w-28 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

export function VerificationDataError({
  error,
  stale,
  refreshing,
  onRetry,
}: {
  error: unknown;
  stale: boolean;
  refreshing: boolean;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="m-4 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-ui text-amber-950"
    >
      <p className="m-0">
        {verificationErrorMessage(error)}
        {stale && " Nội dung bên dưới là dữ liệu đã tải trước đó."}
      </p>
      <Button
        variant="outline"
        size="sm"
        disabled={refreshing}
        onClick={onRetry}
      >
        Thử lại
      </Button>
    </div>
  );
}

export function VerificationEmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="px-5 py-10 text-center">
      <Inbox className="mx-auto size-9 text-primary" aria-hidden="true" />
      <h2 className="mt-3 text-ui-section font-semibold">{title}</h2>
      <p className="mt-2 text-ui text-muted-foreground">{description}</p>
      {children}
    </div>
  );
}

export function VerificationUpdatedAt({
  time,
  refreshing,
  stale = false,
}: {
  time?: number;
  refreshing: boolean;
  stale?: boolean;
}) {
  return (
    <p className="m-0 text-ui-caption leading-5 text-muted-foreground">
      {refreshing
        ? "Đang cập nhật…"
        : time
          ? `${stale ? "Dữ liệu lưu từ" : "Cập nhật lúc"} ${verificationDate(new Date(time).toISOString())}`
          : "Chưa tải được dữ liệu"}
    </p>
  );
}
