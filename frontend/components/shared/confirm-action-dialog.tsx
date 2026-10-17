"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export function ConfirmActionDialog({ title, description, confirmLabel, pending, error, destructive = false, onConfirm, onCancel }: {
  title: string; description: string; confirmLabel: string; pending: boolean; error?: string;
  destructive?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onCancel(); }}>
    <DialogContent busy={pending} onOpenAutoFocus={(event) => { event.preventDefault(); cancel.current?.focus(); }}>
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription className="break-words leading-6">{description}</DialogDescription></DialogHeader>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter className="gap-2"><Button ref={cancel} variant="outline" disabled={pending} onClick={onCancel}>Đóng</Button><Button variant={destructive ? "destructive" : "default"} loading={pending} onClick={onConfirm}>{confirmLabel}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
