"use client";

import { useState } from "react";
import { FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCreateLegalSourceMutation } from "@/hooks/use-legal-sources";
import { useLegalSourceUpload } from "@/hooks/use-legal-source-upload";
import { LegalSourceForm } from "./legal-source-form";
import type { LegalSource } from "@/types/legal-sources";

export function LegalSourceCreateDialog({ onSaved, onClose }: { onSaved: (source: LegalSource) => void; onClose: () => void }) {
  const mutation = useCreateLegalSourceMutation();
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const upload = useLegalSourceUpload(true, mutation.mutateAsync, onSaved);
  function requestClose() {
    if (upload.pending) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  return <Dialog open onOpenChange={(open) => { if (!open) requestClose(); }}>
    <DialogContent busy={upload.pending} className="flex h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-w-3xl">
      <DialogHeader className="shrink-0 p-5 pr-12 text-left sm:p-6 sm:pr-12">
        <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary"><FilePlus2 aria-hidden="true" className="size-5" /></span>
        <DialogTitle>Thêm nguồn pháp lý</DialogTitle>
        <DialogDescription>Nhập thông tin và kiểm tra tài liệu trước khi thêm vào kho.</DialogDescription>
        <ol aria-label="Các bước thêm nguồn" className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-ui-meta">
          {["Thông tin & tải tệp", "Xem trước & xác nhận"].map((label, index) => <li key={label} aria-current={Number(Boolean(upload.preview)) === index ? "step" : undefined} className={Number(Boolean(upload.preview)) === index ? "font-semibold text-primary" : "text-muted-foreground"}>{index + 1}. {label}</li>)}
        </ol>
      </DialogHeader>
      {discard && <div role="alert" className="mx-5 mb-4 shrink-0 rounded-xl border border-border bg-muted p-4 sm:mx-6">
        <p className="text-ui font-medium">Bỏ thông tin đang nhập?</p>
        <p className="mt-1 text-ui-meta text-muted-foreground">Thông tin và tệp đã chọn sẽ không được lưu.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button size="sm" variant="outline" onClick={() => setDiscard(false)} ref={(node) => { node?.focus(); }}>Tiếp tục nhập</Button>
          <Button size="sm" variant="destructive" onClick={onClose}>Bỏ thay đổi</Button>
        </div>
      </div>}
      <div hidden={discard} className={discard ? "hidden" : "flex min-h-0 flex-1 flex-col"}>
        <LegalSourceForm upload={upload} onCancel={requestClose} onChange={() => setDirty(true)} />
      </div>
    </DialogContent>
  </Dialog>;
}
