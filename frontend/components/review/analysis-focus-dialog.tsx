"use client";

import { Button } from "@/components/ui/button";

import { useId, useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReviewAllowanceSummary } from "@/components/review/review-allowance-summary";

type AnalysisFocusDialogProps = {
  contractTitle: string;
  isReviewing: boolean;
  onDismiss: () => void;
  onReview: (focus: string) => void;
  orgId?: string;
  role?: string;
};

export function AnalysisFocusDialog({ contractTitle, isReviewing, onDismiss, onReview, orgId, role }: AnalysisFocusDialogProps) {
  const id = useId();
  const [focus, setFocus] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isReviewing) onReview(focus.trim());
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isReviewing) onDismiss(); }}>
    <DialogContent busy={isReviewing} className="flex flex-col gap-0 overflow-hidden p-0 font-sans sm:max-w-[560px]">
      <DialogHeader className="shrink-0 p-5 pr-10 text-left sm:p-6 sm:pr-12">
        <div className="w-11 h-11 grid place-items-center text-primary bg-accent rounded-xl [&_svg]:w-5"><Icon name="sparkle" /></div>
        <DialogTitle className="mt-2 text-ui-dialog leading-tight">Bạn muốn AI chú ý điều gì?</DialogTitle>
        <DialogDescription className="break-words text-ui leading-6 [overflow-wrap:anywhere]">Đã tải lên “{contractTitle}”. Bạn có thể bổ sung điều khoản cần ưu tiên hoặc bắt đầu rà soát ngay.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="flex min-h-0 flex-col">
        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6 sm:pb-6">
        <ReviewAllowanceSummary orgId={orgId} role={role} />
        <label htmlFor={`${id}-focus`} className="mb-2 block text-ui font-semibold text-card-foreground">Trọng tâm rà soát <span className="font-normal text-muted-foreground">(không bắt buộc)</span></label>
        <textarea id={`${id}-focus`} aria-describedby={`${id}-hint`} autoFocus value={focus} onChange={(event) => setFocus(event.target.value)} placeholder="Ví dụ: ưu tiên điều khoản thanh toán, phạt vi phạm và chấm dứt hợp đồng..." maxLength={1000} disabled={isReviewing} className="w-full min-h-28 resize-y border border-input bg-card text-card-foreground placeholder:text-muted-foreground placeholder:opacity-100 text-ui-document leading-[1.6] p-3 rounded-[9px] focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:opacity-60" />
        <p id={`${id}-hint`} className="mb-0 mt-2 text-ui-meta leading-5 text-muted-foreground">Để trống, AI vẫn rà soát toàn bộ hợp đồng. Chọn “Để sau” để giữ hợp đồng trong danh sách và chưa chạy AI.</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2.5 border-t border-border p-5 sm:px-6 sm:py-4">
          <Button variant="outline" type="button" onClick={onDismiss} disabled={isReviewing}>Để sau</Button>
          <Button type="submit" disabled={isReviewing}><Icon name="sparkle" />{isReviewing ? "Đang bắt đầu rà soát…" : "Bắt đầu rà soát"}</Button>
        </div>
      </form>
    </DialogContent>
    </Dialog>
  );
}
