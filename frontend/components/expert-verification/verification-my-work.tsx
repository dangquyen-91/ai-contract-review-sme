"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MyWorkFilters } from "./my-work-filters";
import { MyWorkTable } from "./my-work-table";
import { useMyVerifications } from "@/hooks/expert-verification/use-my-verifications";
import {
  VerificationDataError,
  VerificationEmptyState,
  VerificationListSkeleton,
  VerificationUpdatedAt,
} from "./verification-data-state";
import { routes } from "@/config/routes";
import { useRestoreVerificationList } from "@/hooks/expert-verification/use-verification-list-navigation";

export function VerificationMyWork() {
  const controller = useMyVerifications();
  const { filter, query, setPage } = controller;
  const data = query.data;
  useRestoreVerificationList(Boolean(data && !query.isFetching));
  return (
    <section className="space-y-6 text-card-foreground">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="m-0 text-ui-caption font-semibold uppercase tracking-wide text-primary">
            Không gian chuyên gia
          </p>
          <h1 className="mb-0 mt-2 text-ui-title font-bold">
            Công việc của tôi
          </h1>
          <p className="mb-0 mt-2 text-ui text-muted-foreground">
            Theo dõi những yêu cầu bạn đã nhận và xem lại kết quả từng lần xác
            minh.
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
            aria-hidden="true"
            className={
              query.isFetching ? "animate-spin motion-reduce:animate-none" : ""
            }
          />
          Làm mới
        </Button>
      </header>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <MyWorkFilters
          key={`${filter.search}:${filter.type}:${filter.from}:${filter.to}`}
          controller={controller}
        />
        {query.isError && (
          <VerificationDataError
            error={query.error}
            stale={Boolean(data)}
            refreshing={query.isFetching}
            onRetry={() => {
              void query.refetch();
            }}
          />
        )}
        <div aria-busy={query.isFetching}>
          {query.isPending ? (
            <VerificationListSkeleton />
          ) : data?.items.length ? (
            <MyWorkTable items={data.items} />
          ) : (
            !query.isError && (
              <VerificationEmptyState
                title={
                  filter.status === "in_progress"
                    ? "Bạn chưa có công việc đang xử lý"
                    : "Chưa có công việc phù hợp"
                }
                description="Thử đổi bộ lọc hoặc vào hàng đợi để tiếp nhận yêu cầu mới."
              >
                <Button asChild variant="outline" size="sm">
                  <Link href={routes.expertVerification}>
                    Xem yêu cầu xác minh
                  </Link>
                </Button>
              </VerificationEmptyState>
            )
          )}
        </div>
        {data && (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p role="status" className="m-0 text-ui-meta text-muted-foreground">
              {data.total} lần xác minh · Trang {data.page}/{data.pages}
            </p>
            <nav aria-label="Phân trang công việc" className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={query.isFetching || filter.page <= 1}
                onClick={() => setPage(filter.page - 1)}
              >
                <ChevronLeft aria-hidden="true" />
                Trước
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={query.isFetching || filter.page >= data.pages}
                onClick={() => setPage(filter.page + 1)}
              >
                Sau
                <ChevronRight aria-hidden="true" />
              </Button>
            </nav>
          </footer>
        )}
      </div>
      <VerificationUpdatedAt
        time={query.dataUpdatedAt}
        refreshing={query.isFetching}
        stale={query.isError}
      />
      <p className="m-0 text-ui-meta text-muted-foreground">
        Mỗi lần xác minh được hiển thị riêng. Bản lưu đã kết thúc chỉ để xem
        lại; yêu cầu đang chờ tiếp nhận nằm trong “Yêu cầu xác minh”.
      </p>
    </section>
  );
}
