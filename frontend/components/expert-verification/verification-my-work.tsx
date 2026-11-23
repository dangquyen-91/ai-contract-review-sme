"use client";

import Link from "next/link";
import {
  BriefcaseBusiness,
  History,
  ListFilter,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MyWorkFilters } from "./my-work-filters";
import { MyWorkTable } from "./my-work-table";
import { MyWorkStatus } from "./my-work-status";
import { VerificationListPagination } from "./verification-list-pagination";
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
    <section className="space-y-5 text-[#28364c]">
      <header className="flex flex-wrap items-start justify-between gap-4 pb-1">
        <div>
          <p className="m-0 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#315eac]">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Không gian chuyên gia
          </p>
          <h1 className="mb-0 mt-3 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
            Công việc của tôi
          </h1>
          <p className="mb-0 mt-3 max-w-2xl text-sm leading-6 text-[#6b778a]">
            Tiếp tục công việc đang xử lý và xem lại kết quả từng lần xác minh
            của bạn.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-10 text-[#315eac]"
          >
            <Link href={routes.expertVerification}>
              <BriefcaseBusiness className="size-4" aria-hidden="true" />
              Tiếp nhận yêu cầu
            </Link>
          </Button>
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
              aria-hidden="true"
              className={
                query.isFetching
                  ? "animate-spin motion-reduce:animate-none"
                  : ""
              }
            />
            Làm mới
          </Button>
        </div>
      </header>
      <MyWorkStatus
        value={filter.status}
        onChange={(status) => controller.applyFilters({ status })}
      />
      <div className="overflow-hidden rounded-2xl border border-[#e1e5ec] bg-white shadow-[0_8px_30px_-24px_#34496740]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9edf3] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <ListFilter className="size-5 text-[#65738a]" aria-hidden="true" />
            <h2 className="m-0 text-base font-semibold">Danh sách công việc</h2>
            {data && (
              <span className="rounded-md bg-[#eef2f8] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#526782]">
                {data.total}
                <span className="sr-only"> lần xác minh phù hợp</span>
              </span>
            )}
          </div>
          <p className="m-0 flex items-center gap-2 text-xs text-[#6b778a]">
            <History className="size-3.5" aria-hidden="true" />
            Mỗi lần xác minh được lưu riêng
          </p>
        </div>
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
          <footer className="border-t border-[#e9edf3] bg-[#fafbfd]">
            <VerificationListPagination
              total={data.total}
              page={data.page}
              pages={data.pages}
              limit={data.limit}
              label="Phân trang công việc"
              unit="lần xác minh"
              disabled={query.isFetching}
              onPage={setPage}
            />
          </footer>
        )}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3 text-xs leading-5 text-[#7a8698]">
        <p className="m-0 max-w-2xl">
          Bản lưu đã kết thúc chỉ để xem lại. Bạn có thể tiếp nhận công việc mới
          trong “Yêu cầu xác minh”.
        </p>
        <VerificationUpdatedAt
          time={query.dataUpdatedAt}
          refreshing={query.isFetching}
          stale={query.isError}
        />
      </div>
    </section>
  );
}
