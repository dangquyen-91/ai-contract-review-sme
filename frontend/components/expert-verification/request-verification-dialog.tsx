"use client";

import { useId, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type RequestVerificationDialogProps = {
  title: string;
  findingCount: number;
  pending: boolean;
  submitDisabled: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (note: string) => Promise<void>;
};

export function RequestVerificationDialog({ title, findingCount, pending, submitDisabled, error, onClose, onSubmit }: RequestVerificationDialogProps) {
  const id = useId();
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const submitting = useRef(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent || pending || submitDisabled || submitting.current) return;
    submitting.current = true;
    try { await onSubmit(note.trim()); }
    finally { submitting.current = false; }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <DialogContent busy={pending} className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden bg-card text-card-foreground [color-scheme:light] sm:max-w-xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-ui-dialog leading-7 text-card-foreground">Gửi chuyên gia kiểm tra</DialogTitle>
          <DialogDescription className="text-ui leading-6 text-muted-foreground">Chuyên gia sẽ đối chiếu và kiểm tra lại kết quả AI của bạn.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-5">
          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-ui leading-6">
              <p className="m-0 break-words font-semibold text-card-foreground [overflow-wrap:anywhere]">{title}</p>
              <p className="mb-0 mt-1 text-ui-meta text-muted-foreground">{findingCount} điểm cần lưu ý trong kết quả AI đã lưu.</p>
            </div>
            <label htmlFor={`${id}-note`} className="grid gap-2 text-ui font-medium text-card-foreground">
              Ghi chú cho chuyên gia (không bắt buộc)
              <textarea id={`${id}-note`} value={note} onChange={(event) => setNote(event.target.value)} disabled={pending} maxLength={2000} rows={3}
                placeholder="Ví dụ: Kiểm tra kỹ điều khoản thanh toán và trách nhiệm bồi thường."
                className="min-h-24 w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-ui font-normal leading-6 text-card-foreground placeholder:text-muted-foreground [color-scheme:light] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60" />
            </label>
            <div className="rounded-lg border border-border bg-muted/50 p-3 text-ui-meta leading-6 text-card-foreground">
              <p className="m-0 flex items-start gap-2"><ShieldCheck className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" /><span>Chuyên gia nhận bản văn bản đã che thông tin được hệ thống nhận diện.</span></p>
              <details className="mt-2 text-muted-foreground">
                <summary className="w-fit cursor-pointer rounded-sm text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring">Thông tin chia sẻ</summary>
                <p className="mb-0 mt-2">Yêu cầu chia sẻ nội dung hợp đồng và kết quả rà soát với chuyên gia LawScan. Việc nhận diện có thể chưa bao phủ hết dữ liệu; hãy tránh ghi thêm thông tin cá nhân không cần thiết trong ghi chú.</p>
              </details>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox id={`${id}-consent`} checked={consent} onCheckedChange={(value) => setConsent(value === true)} disabled={pending} required className="mt-1" />
              <label htmlFor={`${id}-consent`} className="cursor-pointer text-ui leading-6 text-card-foreground">Tôi đồng ý chia sẻ nội dung hợp đồng và kết quả rà soát với chuyên gia LawScan để xác minh.</label>
            </div>
            {error && <p role="alert" className="m-0 rounded-lg border border-rose-200 bg-rose-50 p-3 text-ui leading-6 text-rose-900">{error}</p>}
          </div>
          <DialogFooter className="shrink-0 border-t border-border pt-4">
            <Button variant="outline" disabled={pending} onClick={onClose}>Để sau</Button>
            <Button type="submit" loading={pending} disabled={!consent || submitDisabled}>Gửi yêu cầu</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
