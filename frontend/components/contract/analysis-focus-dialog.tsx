"use client";

import { Button } from "@/components/ui/button";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/icon";
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [focus, setFocus] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isReviewing) onReview(focus.trim());
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="analysis-focus-title"
      aria-describedby="analysis-focus-description"
      onCancel={(event) => { event.preventDefault(); if (!isReviewing) onDismiss(); }}
      className="fixed inset-0 m-auto w-[min(460px,calc(100%-32px))] max-h-[calc(100dvh-32px)] overflow-y-auto border border-border bg-card text-card-foreground font-sans [color-scheme:light] shadow-[0_24px_80px_rgb(20_33_61_/_0.22)] p-0 rounded-[16px] backdrop:[background:rgb(16_28_50_/_0.56)]"
    >
      <form onSubmit={submit} className="p-6 [@media_(max-width:_580px)]:p-5">
        <div className="w-11 h-11 grid place-items-center text-primary bg-accent rounded-xl [&_svg]:w-5"><Icon name="sparkle" /></div>
        <h2 id="analysis-focus-title" className="text-card-foreground text-ui-dialog font-semibold mt-4 mb-0">AI cần tập trung vào</h2>
        <p id="analysis-focus-description" className="text-muted-foreground text-ui leading-[1.6] mt-2 mb-0 break-words">Đã tải lên “{contractTitle}”. Bạn có thể nêu điều khoản cần ưu tiên trước khi rà soát.</p>
        <ReviewAllowanceSummary orgId={orgId} role={role} />
        <label htmlFor="analysis-focus-input" className="block text-card-foreground text-ui font-bold mt-5 mb-2">Trọng tâm rà soát <span className="text-muted-foreground font-normal">(không bắt buộc)</span></label>
        <textarea id="analysis-focus-input" autoFocus value={focus} onChange={(event) => setFocus(event.target.value)} placeholder="Ví dụ: ưu tiên điều khoản thanh toán, phạt vi phạm và chấm dứt hợp đồng..." maxLength={1000} disabled={isReviewing} className="w-full min-h-28 resize-y border border-input bg-card text-card-foreground placeholder:text-muted-foreground placeholder:opacity-100 text-ui-document leading-[1.6] p-3 rounded-[9px] focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:opacity-60" />
        <div className="flex justify-end gap-2.5 mt-5 [@media_(max-width:_580px)]:flex-col-reverse">
          <Button variant="default" size="default" type="button" onClick={() => onReview("")} disabled={isReviewing} >Bỏ qua</Button>
          <Button variant="default" size="default" type="submit" disabled={isReviewing} ><Icon name="sparkle" />{isReviewing ? "AI đang rà soát..." : "Rà soát"}</Button>
        </div>
      </form>
    </dialog>
  );
}
