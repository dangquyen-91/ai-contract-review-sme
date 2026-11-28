"use client";

import { useEffect, useState } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { toast } from "sonner";
import { RefreshCw, Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAiJobOverview, useAiJobs, useCancelAiJob } from "@/hooks/admin/use-ai-jobs";
import { usePaginationPage } from "@/hooks/shared/use-pagination-page";
import {
  aiJobElapsedMs,
  aiJobErrorLabels,
  aiJobStageLabels,
  aiJobStatusLabels,
  canCancelAiJob,
  formatDuration,
} from "@/lib/admin/ai-job-labels";
import type { AiJob, AiJobErrorCode, AiJobFilters, AiJobStatus } from "@/types/admin-operations";
import { NativeSelect } from "@/components/ui/native-select";
import { ListPagination } from "@/components/management/list-pagination";
import { formatVietnamDateTime } from "@/lib/format/date-time";
import styles from "@/styles/user_management/user-management.module.css";
import { JobBadge } from "./ai-job-badge";
import { AiJobDetailDialog } from "./ai-job-detail-dialog";
import { AiJobOverviewPanel } from "./ai-job-overview";

const PAGE_SIZE = 20;
const statusFilters: { value: AiJobFilters["status"] & string; label: string }[] = [
  { value: "stuck", label: "Có thể bị treo" },
  ...(Object.entries(aiJobStatusLabels) as [AiJobStatus, string][]).map(([value, label]) => ({ value, label })),
];
const errorFilters = Object.entries(aiJobErrorLabels) as [AiJobErrorCode, string][];

// The filter lives in the address so a dashboard link can open, e.g., the stuck jobs.
const statusParser = parseAsStringLiteral(statusFilters.map((option) => option.value));

function stageText(job: AiJob) {
  if (job.status === "queued") return "Chờ bắt đầu";
  return job.currentStage ? aiJobStageLabels[job.currentStage] : "—";
}

export function AiJobMonitor() {
  const [page, setPage] = usePaginationPage();
  const [status, setStatus] = useQueryState("status", statusParser.withOptions({ history: "push" }));
  const [searchInput, setSearchInput] = useState("");
  const [rest, setRest] = useState<Omit<AiJobFilters, "status">>({ errorCode: "", search: "" });
  const filters: AiJobFilters = { ...rest, status: status ?? "" };
  const [selected, setSelected] = useState<AiJob | null>(null);
  const [confirming, setConfirming] = useState<AiJob | null>(null);
  const overview = useAiJobOverview();
  const list = useAiJobs(page, PAGE_SIZE, filters);
  const cancel = useCancelAiJob();
  const [now, setNow] = useState(() => Date.now());
  const hasFilters = Boolean(filters.status || filters.errorCode || filters.search);
  const applyFilters = ({ status: nextStatus, ...change }: Partial<AiJobFilters>) => {
    if (nextStatus !== undefined) void setStatus(nextStatus || null);
    setRest((current) => ({ ...current, ...change }));
    void setPage(1);
  };
  const clearFilters = () => {
    setSearchInput("");
    applyFilters({ status: "", errorCode: "", search: "" });
  };
  const summary = [
    filters.search && `“${filters.search}”`,
    statusFilters.find((option) => option.value === filters.status)?.label,
    filters.errorCode && aiJobErrorLabels[filters.errorCode],
  ].filter(Boolean);
  const refresh = () => {
    setNow(Date.now());
    void overview.refetch();
    void list.refetch();
  };
  const confirmCancel = () => {
    if (!confirming) return;
    cancel.mutate(confirming.id, {
      onSuccess: (result) => {
        setConfirming(null);
        setSelected(null);
        toast.success(result.status === "cancelled" ? "Đã hủy tác vụ và hoàn lượt cho tài khoản." : "Đã gửi yêu cầu hủy. Tác vụ sẽ dừng ở bước kế tiếp.");
      },
    });
  };

  useEffect(() => {
    if (list.data && page > list.data.totalPages) void setPage(list.data.totalPages);
  }, [list.data, page, setPage]);
  // Waiting times keep counting between refreshes.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className={styles.workspace} aria-label="Giám sát AI">
      {overview.data ? (
        <AiJobOverviewPanel overview={overview.data} onShowStuck={() => applyFilters({ status: "stuck" })} />
      ) : overview.isError ? (
        <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {overview.error.message}
          <Button variant="outline" size="sm" onClick={() => void overview.refetch()}>Thử lại</Button>
        </div>
      ) : (
        <p role="status" className="mb-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Đang tải số liệu AI…</p>
      )}
      <header className={styles.heading}>
        <div className={styles.headingCopy}>
          <span className={styles.headingIcon}><Sparkles size={20} aria-hidden="true" /></span>
          <div>
            <h2>
              Tác vụ rà soát{" "}
              <span className={styles.count}>{list.data ? list.data.total.toLocaleString("vi-VN") : "—"}</span>
            </h2>
            <p>Theo dõi từng lượt rà soát trên toàn hệ thống. Chỉ hiển thị tên hợp đồng, không hiển thị nội dung.</p>
          </div>
        </div>
      </header>
      <div className={styles.panel}>
        <form
          className={styles.toolbar}
          onSubmit={(event) => {
            event.preventDefault();
            applyFilters({ search: searchInput.trim() });
          }}
        >
          <div className={styles.search}>
            <Search size={17} aria-hidden="true" />
            <Input
              aria-label="Tìm theo tên hợp đồng, tài khoản hoặc email"
              placeholder="Tìm theo hợp đồng, tài khoản hoặc email…"
              maxLength={100}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <Button type="submit" size="sm" variant="ghost" className={styles.searchButton}>Tìm kiếm</Button>
          </div>
          <div className={styles.filters}>
            <NativeSelect
              aria-label="Lọc trạng thái"
              value={filters.status}
              onChange={(event) => applyFilters({ status: event.target.value as AiJobFilters["status"] })}
            >
              <option value="">Tất cả trạng thái</option>
              {statusFilters.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </NativeSelect>
            <NativeSelect
              aria-label="Lọc nguyên nhân lỗi"
              value={filters.errorCode}
              onChange={(event) => applyFilters({ errorCode: event.target.value as AiJobFilters["errorCode"] })}
            >
              <option value="">Mọi nguyên nhân lỗi</option>
              {errorFilters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </NativeSelect>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Tải lại"
              title="Tải lại"
              className={styles.refresh}
              disabled={list.isFetching}
              onClick={refresh}
            >
              <RefreshCw className={list.isFetching ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />
            </Button>
          </div>
        </form>
        {hasFilters && (
          <div className={styles.filterSummary}>
            <span>Đang lọc: {summary.join(" · ")}</span>
            <Button size="xs" variant="ghost" onClick={clearFilters}><X aria-hidden="true" />Xóa bộ lọc</Button>
          </div>
        )}
        {list.isPending ? (
          <p role="status" className="px-6 py-12 text-center text-sm text-slate-500">Đang tải tác vụ…</p>
        ) : list.isError ? (
          <div role="alert" className="grid justify-items-center gap-3 px-6 py-12 text-center text-sm">
            <p>{list.error.message}</p>
            <Button variant="outline" size="sm" onClick={() => void list.refetch()}>Thử lại</Button>
          </div>
        ) : (
          <div aria-busy={list.isFetching}>
            <Table className="min-w-225">
              <caption className="sr-only">Hợp đồng, tài khoản, trạng thái, giai đoạn và thời gian của từng tác vụ rà soát</caption>
              <TableHeader>
                <TableRow>
                  {["Hợp đồng", "Tài khoản", "Trạng thái", "Giai đoạn", "Thời gian", "Bắt đầu lúc", "Thao tác"].map((label) => (
                    <TableHead scope="col" key={label}>{label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.items.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="max-w-60 whitespace-normal font-medium">{job.contractTitle}</TableCell>
                    <TableCell className="max-w-50 whitespace-normal">
                      <span className="block">{job.account.name}</span>
                      <span className="text-xs text-slate-500">{job.account.type === "organization" ? "Tổ chức" : "Cá nhân"}</span>
                    </TableCell>
                    <TableCell>
                      <JobBadge job={job} />
                      {/* The cause matters for failures; a cancelled job's badge already says it all. */}
                      {job.status === "failed" && job.errorCode && (
                        <span className="mt-1 block text-xs text-red-600">{aiJobErrorLabels[job.errorCode]}</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{stageText(job)}</TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">{formatDuration(aiJobElapsedMs(job, now))}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatVietnamDateTime(job.startedAt ?? job.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelected(job)}>Chi tiết</Button>
                        {canCancelAiJob(job) && (
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => { cancel.reset(); setConfirming(job); }}>
                            Hủy
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {list.data.items.length === 0 && (
              <div role="status" className={styles.empty}>
                <h3>{hasFilters ? "Không có tác vụ phù hợp" : "Chưa có tác vụ rà soát nào."}</h3>
                {hasFilters && <Button size="sm" variant="outline" onClick={clearFilters}>Xóa bộ lọc</Button>}
              </div>
            )}
            <ListPagination
              page={page}
              total={list.data.total}
              limit={list.data.limit}
              totalPages={list.data.totalPages}
              busy={list.isFetching}
              unit="tác vụ"
              label="Phân trang tác vụ"
              note="tự cập nhật mỗi 30 giây"
              onPageChange={(next) => void setPage(next)}
            />
          </div>
        )}
      </div>
      <AiJobDetailDialog job={selected} now={now} onClose={() => setSelected(null)} onCancel={(job) => { cancel.reset(); setConfirming(job); }} />
      <Dialog open={confirming !== null} onOpenChange={(open) => { if (!open && !cancel.isPending) setConfirming(null); }}>
        <DialogContent showCloseButton={!cancel.isPending}>
          <DialogTitle>Hủy tác vụ rà soát?</DialogTitle>
          <DialogDescription>
            Tác vụ của “{confirming?.contractTitle}” sẽ dừng và lượt rà soát được hoàn lại cho {confirming?.account.name}. Thao tác này được ghi vào nhật ký quản trị.
          </DialogDescription>
          {cancel.isError && <p role="alert" className="text-sm text-red-600">{cancel.error.message}</p>}
          <DialogFooter>
            <Button variant="outline" disabled={cancel.isPending} onClick={() => setConfirming(null)}>Không hủy</Button>
            <Button variant="destructive" loading={cancel.isPending} onClick={confirmCancel}>Hủy tác vụ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
