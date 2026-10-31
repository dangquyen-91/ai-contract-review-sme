"use client";

import { VerificationWorkspaceLink } from "./verification-workspace-link";
import { useVerificationQueueFilter } from "@/hooks/expert-verification/use-verification-queue-filter";
import { useRestoreVerificationList } from "@/hooks/expert-verification/use-verification-list-navigation";
import { ArrowRight, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useVerificationQueue } from "@/hooks/expert-verification/use-verification-workspace";
import { verificationDate, verificationStatuses } from "@/lib/review/verification-display";
import { verificationErrorMessage } from "@/lib/review/expert-verification";
import { contractTypeLabels } from "@/config/contract-display";
import type { VerificationQueueFilter } from "@/types/verification-workspace";

const filters: { value: VerificationQueueFilter; label: string }[] = [
  { value: "all", label: "Tất cả" }, { value: "requested", label: "Chờ tiếp nhận" }, { value: "in_progress", label: "Tôi đang xử lý" },
];

export function VerificationQueue({ initialFilter = "all" }: { initialFilter?: VerificationQueueFilter }) {
  const [filter, setFilter] = useVerificationQueueFilter(initialFilter);
  const query = useVerificationQueue(filter);
  useRestoreVerificationList(Boolean(query.data && !query.isFetching));
  return (
    <section className="space-y-6 text-card-foreground">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="m-0 text-ui-caption font-semibold uppercase tracking-wide text-primary">Không gian chuyên gia</p>
          <h1 className="mb-0 mt-2 text-ui-title font-bold">Yêu cầu xác minh</h1>
          <p className="mb-0 mt-2 text-ui text-muted-foreground">Tiếp nhận yêu cầu và đối chiếu kết quả AI trên bản hợp đồng đã che thông tin.</p>
        </div>
        <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => { void query.refetch(); }}>
          <RefreshCw className={query.isFetching ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />Làm mới
        </Button>
      </header>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div role="group" aria-label="Lọc yêu cầu xác minh" className="flex flex-wrap gap-2 border-b border-border p-4">
          {filters.map((item) => <Button key={item.value} variant={item.value === filter ? "secondary" : "ghost"} size="sm" aria-pressed={item.value === filter} onClick={() => setFilter(item.value)}>{item.label}</Button>)}
        </div>
        {query.isError && <div role="alert" className="m-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-ui text-amber-950">{verificationErrorMessage(query.error)}{query.data && " Danh sách bên dưới là dữ liệu lần tải gần nhất."}</div>}
        {query.isPending ? <p role="status" className="p-8 text-ui text-muted-foreground">Đang tải yêu cầu xác minh…</p> : !query.data?.length ? (
          !query.isError && <div className="px-5 py-12 text-center"><ShieldCheck className="mx-auto size-9 text-primary" aria-hidden="true" /><h2 className="mt-3 text-ui-section font-semibold">Chưa có yêu cầu trong mục này</h2><p className="mt-2 text-ui text-muted-foreground">Yêu cầu mới sẽ tự cập nhật. Bạn có thể kiểm tra lại sau.</p></div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Hợp đồng</TableHead><TableHead>Người gửi</TableHead><TableHead>Thời gian gửi</TableHead><TableHead>Trạng thái</TableHead><TableHead><span className="sr-only">Thao tác</span></TableHead></TableRow></TableHeader>
            <TableBody>
              {query.data.map((item) => (
                <TableRow key={item._id} data-verification-row={item._id}>
                  <TableCell className="min-w-48 max-w-80 whitespace-normal"><p className="m-0 break-words font-semibold">{item.contractId?.title || "Hợp đồng không còn khả dụng"}</p><p className="mb-0 mt-1 text-ui-meta text-muted-foreground">{contractTypeLabels[item.contractId?.type ?? ""] ?? "Chưa xác định loại"}</p>
                    <details className="mt-2 text-ui-meta"><summary className="cursor-pointer font-medium text-primary">Ghi chú ưu tiên</summary><p className="mb-0 mt-1 whitespace-pre-wrap break-words">{item.requestNote || "Người gửi không kèm ghi chú ưu tiên."}</p></details>
                  </TableCell>
                  <TableCell>{typeof item.requestedBy === "object" ? item.requestedBy?.name || "Tài khoản không còn khả dụng" : "Người gửi"}</TableCell>
                  <TableCell className="min-w-44 text-ui-meta">{verificationDate(item.requestedAt)}</TableCell>
                  <TableCell><span className={`inline-block rounded-full border px-2.5 py-1 text-ui-meta ${verificationStatuses[item.status].tone}`}>{verificationStatuses[item.status].label}</span></TableCell>
                  <TableCell>{item.contractId ? <Button asChild variant="outline" size="sm"><VerificationWorkspaceLink href={`/expert-verification/${item.reviewId}`}>Xem yêu cầu<ArrowRight aria-hidden="true" /></VerificationWorkspaceLink></Button> : <span className="text-ui-meta text-muted-foreground">Không còn khả dụng</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <p className="m-0 border-t border-border px-4 py-3 text-ui-meta text-muted-foreground">Hiển thị tối đa 100 yêu cầu chờ và các yêu cầu bạn đang xử lý, ưu tiên yêu cầu gửi trước. Tự cập nhật mỗi 15 giây.</p>
      </div>
    </section>
  );
}
