"use client";

import { ListFilter, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVerificationQueueList } from "@/hooks/expert-verification/use-verification-queue-list";
import { useRestoreVerificationList } from "@/hooks/expert-verification/use-verification-list-navigation";
import { VerificationQueueFilters } from "./verification-queue-filters";
import { VerificationQueueTable } from "./verification-queue-table";
import { VerificationQueueStatus } from "./verification-queue-status";
import { VerificationListPagination } from "./verification-list-pagination";
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
    <section className="space-y-5 text-[#28364c]">
      <header className="flex flex-wrap items-start justify-between gap-4 pb-1">
        <div>
          <p className="m-0 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#315eac]">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Không gian chuyên gia
          </p>
          <h1 className="mb-0 mt-3 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
            Yêu cầu xác minh
          </h1>
          <p className="mb-0 mt-3 max-w-2xl text-sm leading-6 text-[#6b778a]">
            Tiếp nhận hợp đồng, đối chiếu kết quả AI và theo dõi công việc xác
            minh của bạn.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-10 border-[#dce3ed] text-[#315eac]"
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
      <VerificationQueueStatus
        value={controller.status}
        onChange={(value) => {
          void controller.setStatus(value);
        }}
      />
      <div className="overflow-hidden rounded-2xl border border-[#e1e5ec] bg-white shadow-[0_8px_30px_-24px_#34496740]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9edf3] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <ListFilter className="size-5 text-[#65738a]" aria-hidden="true" />
            <h2 className="m-0 text-base font-semibold">Danh sách yêu cầu</h2>
            {query.data && (
              <span className="rounded-md bg-[#eef2f8] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#526782]">
                {controller.total}
                <span className="sr-only"> yêu cầu phù hợp</span>
              </span>
            )}
          </div>
          <p className="m-0 flex items-center gap-2 text-xs text-[#6b778a]">
            <span
              className={`size-1.5 rounded-full ${query.isError ? "bg-amber-500" : "bg-[#729781]"}`}
              aria-hidden="true"
            />
            {query.isError ? "Chưa thể cập nhật" : "Tự cập nhật mỗi 15 giây"}
          </p>
        </div>
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
        <footer className="border-t border-[#e9edf3] bg-[#fafbfd]">
          {query.data && (
            <VerificationListPagination
              total={controller.total}
              page={controller.page}
              pages={controller.pages}
              limit={controller.pageSize}
              label="Phân trang yêu cầu xác minh"
              unit="yêu cầu đã tải phù hợp"
              disabled={query.isFetching}
              onPage={controller.setPage}
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-[#e9edf3] px-5 py-3 sm:px-6">
            <p className="m-0 text-xs leading-5 text-[#7a8698]">
              {query.data && `${query.data.length} yêu cầu đã tải · `}
              Tối đa 100 yêu cầu mỗi nhóm.
            </p>
            <VerificationUpdatedAt
              time={query.dataUpdatedAt}
              refreshing={query.isFetching}
              stale={query.isError}
            />
          </div>
        </footer>
      </div>
    </section>
  );
}
