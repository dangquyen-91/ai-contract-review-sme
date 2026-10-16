"use client";

import { useEffect, useId, useRef } from "react";
import { Icon } from "@/components/ui/icon";

export function DocumentDisclosureDialog({ mode, onConfirm, onCancel }: {
  mode: "text" | "original";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const label = mode === "original" ? "file gốc" : "văn bản đầy đủ";
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return <dialog ref={ref} aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
    onCancel={(event) => { event.preventDefault(); onCancel(); }}
    className="fixed inset-0 m-auto max-h-[calc(100dvh-32px)] w-[min(460px,calc(100%-32px))] overflow-y-auto rounded-2xl border border-[#dce4ef] bg-white p-6 text-[#263750] shadow-[0_24px_80px_rgb(20_33_61_/_0.22)] backdrop:bg-[#101c328f]">
    <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff4dc] text-[#875c08]"><Icon name="shield" /></div>
    <h2 id={`${id}-title`} className="mb-0 mt-4 text-ui-dialog font-semibold">Xem {label}?</h2>
    <p id={`${id}-description`} className="mb-0 mt-2 text-ui leading-6 text-[#607087]">{mode === "original" ? "File gốc chưa được che thông tin nhạy cảm." : "Văn bản đầy đủ có thể chứa thông tin cá nhân."} Nội dung sẽ được tải sau khi bạn xác nhận. Bạn muốn tiếp tục?</p>
    <div className="mt-5 flex flex-wrap justify-end gap-3">
      <button type="button" autoFocus onClick={onCancel} className="min-h-11 rounded-lg border border-[#d8e0ea] bg-white px-4 text-ui font-semibold text-[#526178] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2864dc]">Hủy</button>
      <button type="button" onClick={onConfirm} className="min-h-11 rounded-lg bg-[#2864dc] px-4 text-ui font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2864dc]">Xem {label}</button>
    </div>
  </dialog>;
}
