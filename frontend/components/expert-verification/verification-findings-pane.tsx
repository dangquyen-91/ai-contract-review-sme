"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { verificationFindingId, type VerificationController } from "@/hooks/expert-verification/use-verification-controller";
import { VerificationFindingCard } from "./verification-finding-card";

export function VerificationFindingsPane({ controller }: { controller: VerificationController }) {
  const { workspace, pane, filter, setFilter, disabled, pendingCount, processed, openDialog, execute, locate, findingSelection, lastSaved, saved, showLastSaved } = controller;
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!findingSelection || !list.current || pane !== "findings" || controller.dialog) return;
    const card = list.current.querySelector<HTMLElement>(`[data-finding-id="${CSS.escape(findingSelection.id)}"]`);
    if (!card) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (window.matchMedia("(min-width: 1024px)").matches) {
      list.current.scrollTo({ top: list.current.scrollTop + card.getBoundingClientRect().top - list.current.getBoundingClientRect().top - 12, behavior: reduced ? "instant" : "smooth" });
    } else card.scrollIntoView({ block: "center", behavior: reduced ? "instant" : "smooth" });
    card.focus({ preventScroll: true });
  }, [findingSelection, filter, pane, controller.dialog]);
  if (!workspace) return null;
  const visible = workspace.findings.filter((finding) => filter === "all" || (filter === "pending" ? !finding.verification : Boolean(finding.verification)));
  return (
    <section aria-label="Các rủi ro cần xác minh" className={`${pane === "findings" ? "flex" : "hidden"} min-h-0 min-w-0 flex-col rounded-xl border border-border bg-card ${controller.viewMode === "document" ? "lg:hidden" : "lg:flex"}`}>
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
        {lastSaved && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-ui-meta text-emerald-950">
          <p className="m-0 break-words">{lastSaved.removed ? "Đã xóa và lưu lịch sử:" : "Đã lưu:"} {lastSaved.title}</p>
          {!lastSaved.removed && lastSaved.id && <Button variant="link" size="sm" className="h-auto p-0" onClick={showLastSaved}>Xem mục vừa lưu</Button>}
        </div>}
      </header>
      <div ref={list} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {!visible.length && <p role="status" className="p-4 text-ui text-muted-foreground">{filter === "pending" && pendingCount === 0 ? !controller.editable ? "Không còn rủi ro chưa xử lý. Chọn Tất cả để xem kết quả." : "Không còn rủi ro chưa xử lý. Kiểm tra lại kết quả trước khi hoàn tất; bạn vẫn có thể bổ sung rủi ro." : "Không có rủi ro trong bộ lọc này."}</p>}
        {visible.map((finding) => (
          <VerificationFindingCard
            key={verificationFindingId(finding)} finding={finding} editable={!disabled} readOnly={workspace.historical}
            savedAt={saved[verificationFindingId(finding)]} selected={findingSelection?.id === verificationFindingId(finding)}
            onSelect={() => controller.selectFinding(finding)}
            onConfirm={() => { controller.selectFinding(finding); void execute({ kind: "decide", findingId: verificationFindingId(finding), input: { verdict: "confirmed" } }); }}
            onEdit={() => { controller.selectFinding(finding); openDialog({ mode: "edit", finding }); }}
            onReject={() => { controller.selectFinding(finding); openDialog({ mode: "reject", finding }); }}
            onRemove={() => { controller.selectFinding(finding); openDialog({ mode: "remove", finding }); }}
            onLocate={() => locate(finding)}
          />
        ))}
      </div>
    </section>
  );
}
