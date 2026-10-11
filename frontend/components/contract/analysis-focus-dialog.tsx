"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/icon";

type AnalysisFocusDialogProps = {
  contractTitle: string;
  isReviewing: boolean;
  onSkip: () => void;
  onReview: (focus: string) => void;
};

export function AnalysisFocusDialog({ contractTitle, isReviewing, onSkip, onReview }: AnalysisFocusDialogProps) {
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
      onCancel={(event) => { event.preventDefault(); if (!isReviewing) onSkip(); }}
      className="w-[min(460px,calc(100%-32px))] max-h-[calc(100dvh-32px)] overflow-y-auto border border-[#dce4ef] [background:white] text-[color:var(--ink)] shadow-[0_24px_80px_rgb(20_33_61_/_0.22)] p-0 rounded-[16px] backdrop:[background:rgb(16_28_50_/_0.56)]"
    >
      <form onSubmit={submit} className="p-6 [@media_(max-width:_580px)]:p-5">
        <div className="w-11 h-11 grid place-items-center text-[color:var(--accent)] [background:#eaf1ff] rounded-xl [&_svg]:w-5"><Icon name="sparkle" /></div>
        <h2 id="analysis-focus-title" className="text-[length:20px] mt-4 mb-0">AI cần tập trung vào</h2>
        <p id="analysis-focus-description" className="text-[color:var(--muted)] text-[length:12px] leading-[1.6] mt-2 mb-0">Đã tải lên “{contractTitle}”. Bạn có thể nêu điều khoản cần ưu tiên trước khi rà soát.</p>
        <label htmlFor="analysis-focus-input" className="block text-[#34435a] text-[length:11px] font-bold mt-5 mb-2">Trọng tâm rà soát <span className="text-[#929dab] font-normal">(không bắt buộc)</span></label>
        <textarea id="analysis-focus-input" autoFocus value={focus} onChange={(event) => setFocus(event.target.value)} placeholder="Ví dụ: ưu tiên điều khoản thanh toán, phạt vi phạm và chấm dứt hợp đồng..." maxLength={1000} className="w-full min-h-28 resize-y border border-[#d8e0ea] [background:white] text-[color:var(--ink)] text-[length:12px] leading-normal p-3 rounded-[9px]" />
        <div className="flex justify-end gap-2.5 mt-5 [@media_(max-width:_580px)]:flex-col-reverse">
          <button type="button" onClick={onSkip} disabled={isReviewing} className="min-h-[42px] border border-[#d8e0ea] [background:white] text-[#526178] text-[length:11px] font-bold px-4 rounded-[9px] cursor-pointer disabled:opacity-50">Bỏ qua</button>
          <button type="submit" disabled={isReviewing} className="min-h-[42px] inline-flex items-center justify-center gap-2 border-0 [background:var(--accent)] text-white text-[length:11px] font-bold px-4 rounded-[9px] cursor-pointer hover:[background:var(--accent-dark)] disabled:opacity-50"><Icon name="sparkle" />{isReviewing ? "AI đang rà soát..." : "Rà soát"}</button>
        </div>
      </form>
    </dialog>
  );
}
