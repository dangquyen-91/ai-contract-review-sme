"use client";

import { BookOpen, ChevronDown, CircleCheck, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useContractClauses } from "@/hooks/contracts/use-contracts";
import { clauseLabel } from "@/lib/review/clause-label";

export function ClauseSummaries({ contractId }: { contractId: string }) {
  const query = useContractClauses(contractId);
  const clauses = query.data?.filter((clause) => clause.summary?.trim()) ?? [];
  if (query.isPending) {
    return (
      <div role="status" className="space-y-3 border-t border-border pt-6">
        <span className="sr-only">Đang tải diễn giải điều khoản…</span>
        <div className="h-4 w-1/3 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
        <div className="h-14 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
        <div className="h-14 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-ui-meta text-amber-900">
        <p className="m-0">Chưa tải được diễn giải điều khoản.</p>
        <Button size="sm" variant="outline" onClick={() => void query.refetch()}>Thử lại</Button>
      </div>
    );
  }
  if (!clauses.length) return null;

  return (
    <section aria-label="Diễn giải điều khoản" className="min-w-0 border-t border-border pt-6">
      <div className="flex min-w-0 items-start gap-3">
        <BookOpen aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <h3 className="m-0 text-ui-section font-semibold text-card-foreground">Diễn giải điều khoản</h3>
            <Badge variant="secondary" className="tabular-nums">{clauses.length} điều khoản</Badge>
          </div>
          <p className="mb-0 mt-1 text-ui-meta leading-6 text-muted-foreground">Nội dung từng điều khoản được trình bày ngắn gọn để tiện đối chiếu.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        {clauses.map((clause) => (
          <details key={clause.id ?? clause._id ?? clause.index} className="group overflow-hidden rounded-xl border border-border bg-card open:border-primary/25">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none sm:px-5 [&::-webkit-details-marker]:hidden">
              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-ui-meta font-medium tabular-nums text-muted-foreground group-open:bg-accent group-open:text-primary">
                {String(clause.index + 1).padStart(2, "0")}
              </span>
              <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <span className="min-w-0 break-words text-ui font-semibold leading-6 text-card-foreground [overflow-wrap:anywhere]">{clause.title || clauseLabel(clause)}</span>
                <Badge variant={clause.summaryKind === "ai_verified" ? "info" : "neutral"}>
                  {clause.summaryKind === "ai_verified" ? "AI đã đối chiếu" : clause.summaryKind === "excerpt" ? "Trích đoạn" : "Chưa đối chiếu"}
                </Badge>
              </span>
              <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <div className="border-t border-border bg-muted/50 px-4 py-4 sm:px-5">
              <p className={`m-0 flex items-start gap-2 text-ui-meta leading-6 ${clause.summaryKind === "ai_verified" ? "text-primary" : "text-muted-foreground"}`}>
                {clause.summaryKind === "ai_verified" ? <CircleCheck aria-hidden="true" className="mt-1 size-3.5 shrink-0" /> : <Info aria-hidden="true" className="mt-1 size-3.5 shrink-0" />}
                <span>{clause.summaryKind === "ai_verified" ? "Diễn giải đã đối chiếu với nội dung hợp đồng" : clause.summaryKind === "excerpt" ? "Trích đoạn hợp đồng, dùng thay cho diễn giải chưa xác minh được" : "Diễn giải từ kết quả trước đây, chưa có thông tin kiểm chứng"}</span>
              </p>
              <p className="mb-0 mt-3 whitespace-pre-wrap break-words text-ui leading-7 text-card-foreground [overflow-wrap:anywhere]">{clause.summary}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
