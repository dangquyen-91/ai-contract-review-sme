"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/subscription/use-subscription";

const kinds = [
  { key: "analysis", label: "Rà soát AI" },
  { key: "chat", label: "Chat AI" },
  { key: "drafting", label: "Soạn hợp đồng AI" },
] as const;

export function AccountAllowance({
  accountId,
  personal = false,
}: {
  accountId: string;
  personal?: boolean;
}) {
  const query = useSubscription(accountId);
  return (
    <section
      className="rounded-xl border border-border bg-card p-5 sm:p-6"
      aria-label="Hạn mức AI"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Hạn mức AI hiện tại</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {personal
              ? "Chỉ áp dụng cho không gian cá nhân."
              : "Dùng chung trong tổ chức."}{" "}
            Lượt đang giữ chỗ được tính riêng.
          </p>
        </div>
        <Button asChild variant="link" size="sm">
          <Link href={personal ? "/subscription" : "/settings"}>
            Xem gói dịch vụ
          </Link>
        </Button>
      </div>
      {query.isPending ? (
        <div
          role="status"
          aria-label="Đang tải hạn mức"
          className="mt-5 h-16 animate-pulse rounded-lg bg-muted motion-reduce:animate-none"
        />
      ) : query.isError || !query.data ? (
        <p role="alert" className="mt-4 text-sm">
          Chưa tải được hạn mức.{" "}
          <Button variant="link" onClick={() => void query.refetch()}>
            Thử lại
          </Button>
        </p>
      ) : (
        <div className="mt-5 grid gap-6 md:grid-cols-3">
          {kinds.map((kind) => {
            const counter = query.data[kind.key];
            return (
              <div key={kind.key}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{kind.label}</span>
                  <strong className="tabular-nums">
                    {counter.available.toLocaleString("vi-VN")} còn lại
                  </strong>
                </div>
                <progress
                  className="mt-3 h-2 w-full appearance-none overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary"
                  max={Math.max(1, counter.limit)}
                  value={Math.min(
                    counter.limit,
                    counter.used + counter.reserved,
                  )}
                  aria-label={`${kind.label}: đã dùng và giữ chỗ`}
                />
                <p className="mt-2 text-xs leading-5 text-muted-foreground tabular-nums">
                  Đã dùng {counter.used} · Giữ chỗ {counter.reserved} · Hạn mức{" "}
                  {counter.limit}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
