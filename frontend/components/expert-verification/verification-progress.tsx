"use client";

import { ArrowRight, CircleCheck, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VerificationController } from "@/hooks/expert-verification/use-verification-controller";

export function VerificationProgress({ controller }: { controller: VerificationController }) {
  const { workspace, processed, pendingCount, nextPending, setFilter, setPane, query, command, editable, openDialog } = controller;
  if (!workspace) return null;
  const total = workspace.findings.length;
  const complete = total > 0 && pendingCount === 0;
  const StatusIcon = complete ? CircleCheck : ClipboardCheck;
  return (
    <section aria-label="Tiến độ kiểm tra" className={`sticky top-2 z-20 space-y-3 rounded-xl border bg-card p-4 text-card-foreground shadow-sm ${complete ? "border-emerald-200" : "border-blue-100"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl transition-colors duration-200 motion-reduce:transition-none ${complete ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-600"}`}>
            <StatusIcon key={complete ? "done" : "checking"} className="size-5 animate-in fade-in duration-200 motion-reduce:animate-none" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="m-0 text-ui font-semibold">Tiến độ kiểm tra</h2>
            <p className="mb-0 mt-1 text-ui-meta text-muted-foreground">
              {total ? <>{complete ? "Đã kiểm tra đủ" : "Đã kiểm tra"} <strong className={`tabular-nums ${complete ? "text-emerald-800" : "text-card-foreground"}`}>{processed}/{total}</strong> mục</> : "Chưa có mục cần kiểm tra"}
            </p>
          </div>
        </div>
        {!workspace.historical && pendingCount > 0 && <Button variant="outline" size="sm" disabled={query.isError || command.isPending} onClick={nextPending}>
          Mục tiếp theo<ArrowRight aria-hidden="true" />
        </Button>}
        {editable && pendingCount === 0 && <Button variant="outline" size="sm" disabled={query.isError || command.isPending} onClick={() => openDialog({ mode: "approve" })}>
          Xem tổng kết<ArrowRight aria-hidden="true" />
        </Button>}
      </div>
      <div className="flex items-center gap-3">
        <div role="progressbar" aria-label="Số mục đã kiểm tra" aria-valuemin={0} aria-valuemax={Math.max(total, 1)} aria-valuenow={processed}
          aria-valuetext={`${processed} trên ${total} mục đã kiểm tra`} className={`h-2 min-w-0 flex-1 overflow-hidden rounded-full ${complete ? "bg-emerald-100" : "bg-blue-100"}`}>
          <div className={`h-full rounded-full transition-[width,background-color] duration-300 motion-reduce:transition-none ${complete ? "bg-emerald-600" : "bg-primary"}`} style={{ width: total ? `${processed / total * 100}%` : "0%" }} />
        </div>
        {pendingCount > 0 ? <Button size="sm" variant="ghost" className="h-auto shrink-0 px-1 py-1 text-ui-meta font-medium" aria-label={`Lọc ${pendingCount} mục chưa xử lý`}
          onClick={() => { setFilter("pending"); setPane("findings"); }}>Còn {pendingCount} mục</Button>
          : <span className={`shrink-0 text-ui-meta font-medium ${complete ? "text-emerald-800" : "text-muted-foreground"}`}>{complete ? "Đủ mục" : "0 mục"}</span>}
      </div>
    </section>
  );
}
