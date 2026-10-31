"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verificationFindingId, type VerificationController } from "@/hooks/expert-verification/use-verification-controller";
import { VerificationFindingCard } from "./verification-finding-card";

export function VerificationFindingsPane({ controller }: { controller: VerificationController }) {
  const { workspace, pane, filter, setFilter, disabled, pendingCount, processed, openDialog, execute, locate } = controller;
  if (!workspace) return null;
  const visible = workspace.findings.filter((finding) => filter === "all" || (filter === "pending" ? !finding.verification : Boolean(finding.verification)));
  return (
    <section aria-label="Các rủi ro cần xác minh" className={`${pane === "findings" ? "flex" : "hidden"} min-h-0 min-w-0 flex-col rounded-xl border border-border bg-card lg:flex`}>
      <header className="shrink-0 space-y-3 border-b border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-ui-section font-semibold">Điểm cần kiểm tra</h2>
          {!workspace.historical && <Button variant="outline" size="sm" disabled={disabled} onClick={() => openDialog({ mode: "add" })}><Plus aria-hidden="true" />Bổ sung rủi ro</Button>}
        </div>
        <div role="group" aria-label="Lọc kết quả xác minh" className="flex flex-wrap gap-1">
          {([{ key: "pending", label: `Chưa xử lý (${pendingCount})` }, { key: "all", label: `Tất cả (${workspace.findings.length})` }, { key: "processed", label: `Đã xử lý (${processed})` }] as const).map((item) => (
            <Button key={item.key} variant={filter === item.key ? "secondary" : "ghost"} size="sm" aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}>{item.label}</Button>
          ))}
        </div>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {!visible.length && <p role="status" className="p-4 text-ui text-muted-foreground">{filter === "pending" && pendingCount === 0 ? workspace.historical ? "Không còn rủi ro chưa xử lý trong bản lưu này. Chọn Tất cả để xem kết quả." : "Không còn rủi ro chưa xử lý. Kiểm tra lại kết quả trước khi hoàn tất; bạn vẫn có thể bổ sung rủi ro." : "Không có rủi ro trong bộ lọc này."}</p>}
        {visible.map((finding) => (
          <VerificationFindingCard
            key={verificationFindingId(finding)} finding={finding} editable={!disabled} readOnly={workspace.historical}
            onConfirm={() => { void execute({ kind: "decide", findingId: verificationFindingId(finding), input: { verdict: "confirmed" } }); }}
            onEdit={() => openDialog({ mode: "edit", finding })}
            onReject={() => openDialog({ mode: "reject", finding })}
            onRemove={() => openDialog({ mode: "remove", finding })}
            onLocate={() => locate(finding)}
          />
        ))}
      </div>
    </section>
  );
}
