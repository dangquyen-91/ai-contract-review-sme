"use client";

import Link from "next/link";
import { BriefcaseBusiness, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MyWorkFilters } from "./my-work-filters";
import { MyWorkTable } from "./my-work-table";
import { useMyVerifications } from "@/hooks/expert-verification/use-my-verifications";
import { verificationErrorMessage } from "@/lib/review/expert-verification";
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
          <p className="m-0 text-ui-caption font-semibold uppercase tracking-wide text-primary">Không gian chuyên gia</p>
          <h1 className="mb-0 mt-2 text-ui-title font-bold">Công việc của tôi</h1>
          <p className="mb-0 mt-2 text-ui text-muted-foreground">Theo dõi những yêu cầu bạn đã nhận và xem lại kết quả từng lần xác minh.</p>
        </div>
        <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => { void query.refetch(); }}>
          <RefreshCw aria-hidden="true" className={query.isFetching ? "animate-spin motion-reduce:animate-none" : ""} />Làm mới
        </Button>
      </header>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <MyWorkFilters key={`${filter.search}:${filter.type}:${filter.from}:${filter.to}`} controller={controller} />
        {query.isError && <p role="alert" className="m-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-ui text-amber-950">{verificationErrorMessage(query.error)}{data && " Dữ liệu bên dưới là lần tải gần nhất; hãy làm mới để kiểm tra lại."}</p>}
        <div aria-busy={query.isFetching}>
          {query.isPending ? (
            <p role="status" className="p-8 text-ui text-muted-foreground">Đang tải công việc của bạn…</p>
          ) : data?.items.length ? (
            <MyWorkTable items={data.items} />
          ) : !query.isError && (
            <div className="px-5 py-12 text-center">
              <BriefcaseBusiness className="mx-auto size-9 text-primary" aria-hidden="true" />
              <h2 className="mt-3 text-ui-section font-semibold">Chưa có công việc phù hợp</h2>
              <p className="mt-2 text-ui text-muted-foreground">Thử đổi bộ lọc hoặc vào hàng đợi để tiếp nhận yêu cầu mới.</p>
              <Button asChild variant="outline" size="sm"><Link href={routes.expertVerification}>Xem yêu cầu xác minh</Link></Button>
            </div>
          )}
        </div>
        {data && (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p role="status" className="m-0 text-ui-meta text-muted-foreground">{data.total} lần xác minh · Trang {data.page}/{data.pages}</p>
            <nav aria-label="Phân trang công việc" className="flex gap-2">
              <Button size="sm" variant="outline" disabled={query.isFetching || filter.page <= 1} onClick={() => setPage(filter.page - 1)}><ChevronLeft aria-hidden="true" />Trước</Button>
              <Button size="sm" variant="outline" disabled={query.isFetching || filter.page >= data.pages} onClick={() => setPage(filter.page + 1)}>Sau<ChevronRight aria-hidden="true" /></Button>
            </nav>
          </footer>
        )}
      </div>
      <p className="m-0 text-ui-meta text-muted-foreground">Mỗi lần xác minh được hiển thị riêng. Bản lưu đã kết thúc chỉ để xem lại; yêu cầu đang chờ tiếp nhận nằm trong “Yêu cầu xác minh”.</p>
    </section>
  );
}
