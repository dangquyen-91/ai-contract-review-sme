"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVerificationQueueList } from "@/hooks/expert-verification/use-verification-queue-list";
import { useRestoreVerificationList } from "@/hooks/expert-verification/use-verification-list-navigation";
import { VerificationQueueFilters } from "./verification-queue-filters";
import { VerificationQueueTable } from "./verification-queue-table";
import {
  VerificationDataError,
  VerificationEmptyState,
  VerificationListSkeleton,
  VerificationUpdatedAt,
} from "./verification-data-state";
import type { VerificationQueueFilter } from "@/types/verification-workspace";

export function VerificationQueue({
  initialFilter = "all",
}: {
  initialFilter?: VerificationQueueFilter;
}) {
  const controller = useVerificationQueueList(initialFilter);
  const { query, rows, filter } = controller;
  useRestoreVerificationList(Boolean(query.data && !query.isFetching));
  return (
    <section className="space-y-6 text-card-foreground">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="m-0 text-ui-caption font-semibold uppercase tracking-wide text-primary">
            Không gian chuyên gia
          </p>
          <h1 className="mb-0 mt-2 text-ui-title font-bold">
            Yêu cầu xác minh
          </h1>
          <p className="mb-0 mt-2 text-ui text-muted-foreground">
            Tiếp nhận yêu cầu và đối chiếu kết quả AI trên bản hợp đồng đã che
            thông tin.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={query.isFetching}
          onClick={() => {
            void query.refetch();
          }}
        >
          <RefreshCw
            className={
              query.isFetching ? "animate-spin motion-reduce:animate-none" : ""
            }
            aria-hidden="true"
          />
          Làm mới
        </Button>
      </header>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <VerificationQueueFilters
          key={filter.queueSearch}
          controller={controller}
        />
        {query.isError && (
          <VerificationDataError
            error={query.error}
            stale={Boolean(query.data)}
            refreshing={query.isFetching}
            onRetry={() => {
              void query.refetch();
            }}
          />
        )}
        <div aria-busy={query.isFetching}>
          {query.isPending ? (
            <VerificationListSkeleton />
          ) : rows.length ? (
            <VerificationQueueTable items={rows} />
          ) : (
            !query.isError && (
              <VerificationEmptyState
                title="Chưa có yêu cầu phù hợp"
                description="Thử thay đổi bộ lọc. Yêu cầu mới sẽ tự cập nhật khi có người gửi."
              />
            )
          )}
        </div>
        <footer className="space-y-1 border-t border-border px-4 py-3">
          {query.data && (
            <p className="m-0 text-ui-meta text-muted-foreground">
              Hiển thị {rows.length}/{query.data.length} yêu cầu đã tải. Tối đa
              100 yêu cầu mỗi nhóm; tự cập nhật mỗi 15 giây.
            </p>
          )}
          <VerificationUpdatedAt
            time={query.dataUpdatedAt}
            refreshing={query.isFetching}
            stale={query.isError}
          />
        </footer>
      </div>
    </section>
  );
}
