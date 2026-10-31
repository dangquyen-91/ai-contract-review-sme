"use client";

import { Columns2, FileText, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VerificationController } from "@/hooks/expert-verification/use-verification-controller";

export function VerificationViewControls({ controller }: { controller: VerificationController }) {
  const { pane, setPane, viewMode, setViewMode } = controller;
  return (
    <>
      <div role="group" aria-label="Chọn nội dung đối chiếu" className="flex flex-wrap gap-2 lg:hidden">
        <Button size="sm" variant={pane === "findings" ? "secondary" : "ghost"} aria-pressed={pane === "findings"} onClick={() => setPane("findings")}><ListChecks aria-hidden="true" />Điểm cần kiểm tra</Button>
        <Button size="sm" variant={pane === "document" ? "secondary" : "ghost"} aria-pressed={pane === "document"} onClick={() => setPane("document")}><FileText aria-hidden="true" />Văn bản</Button>
      </div>
      <div role="group" aria-label="Bố cục đối chiếu" className="hidden flex-wrap items-center gap-2 lg:flex">
        <span className="mr-1 text-ui-meta text-muted-foreground">Chế độ xem</span>
        {([{ value: "split", label: "Đối chiếu hai bên", Icon: Columns2 }, { value: "findings", label: "Mở rộng rủi ro", Icon: ListChecks }, { value: "document", label: "Mở rộng văn bản", Icon: FileText }] as const).map(({ value, label, Icon }) => (
          <Button key={value} size="sm" variant={viewMode === value ? "secondary" : "ghost"} aria-pressed={viewMode === value}
            onClick={() => { setViewMode(value); if (value !== "split") setPane(value); }}>
            <Icon aria-hidden="true" />{label}
          </Button>
        ))}
      </div>
    </>
  );
}
