"use client";

import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLegalSourceDetail } from "@/hooks/legal-sources/use-legal-source-detail";
import { LegalSourceDetailContent } from "./legal-source-detail-content";

export function LegalSourceDetailDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const workflow = useLegalSourceDetail(id, onClose);
  const blocked = workflow.busy || workflow.append || workflow.editing || workflow.deleting;
  function close() { if (!blocked) onClose(); }
  return <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
    <DialogContent busy={blocked} className="flex h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
      <DialogHeader className="shrink-0 border-b border-border p-5 pr-12 text-left sm:px-6">
        <div className="flex min-w-0 items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary"><FileText className="size-5" aria-hidden="true" /></span><div className="min-w-0"><p className="mb-1 text-ui-meta text-muted-foreground">Chi tiết nguồn pháp lý</p><DialogTitle className="break-words text-ui-card leading-6 sm:text-ui-dialog">{workflow.source?.title || "Thông tin nguồn pháp lý"}</DialogTitle></div></div>
        <DialogDescription>Thông tin văn bản, độ đầy đủ tài liệu và tiến trình xử lý.</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6"><LegalSourceDetailContent workflow={workflow} /></div>
      <div className="flex shrink-0 justify-end border-t border-border px-5 py-4 sm:px-6"><Button variant="outline" className="w-full sm:w-auto" disabled={blocked} onClick={close}>Đóng chi tiết</Button></div>
    </DialogContent>
  </Dialog>;
}
