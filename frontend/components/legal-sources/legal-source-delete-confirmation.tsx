"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";
import type { LegalSource } from "@/types/legal-sources";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export function LegalSourceDeleteConfirmation({ source, pending, error, onConfirm, onCancel }: {
  source: LegalSource; pending: boolean; error: string; onConfirm: () => void; onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onCancel(); }}>
    <DialogContent busy={pending} onOpenAutoFocus={(event) => { event.preventDefault(); cancelRef.current?.focus(); }}>
      <DialogHeader className="text-left">
        <span className="mb-2 grid size-11 place-items-center rounded-xl bg-destructive/10 text-destructive"><Trash2 className="size-5" aria-hidden="true" /></span>
        <DialogTitle>Xóa nguồn pháp lý?</DialogTitle>
        <DialogDescription className="break-words leading-6">Nguồn “{source.title}” và các đoạn tham chiếu sẽ bị xóa khỏi kho. Không thể hoàn tác thao tác này.</DialogDescription>
      </DialogHeader>
      {error && <p role="alert" className="text-ui text-destructive">{error}</p>}
      <DialogFooter className="gap-3 border-t border-border pt-5">
        <Button ref={cancelRef} variant="outline" disabled={pending} onClick={onCancel}>Hủy</Button>
        <Button variant="destructive" loading={pending} onClick={onConfirm} className="min-w-36">{!pending && <Trash2 aria-hidden="true" />}{pending ? "Đang xóa…" : "Xóa nguồn"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
