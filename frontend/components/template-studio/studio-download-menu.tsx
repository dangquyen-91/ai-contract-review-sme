"use client";

import { Download, FileText, LockKeyhole, Printer } from "lucide-react";
import { useRef } from "react";

export function StudioDownloadMenu({
  ready,
  busy,
  onWord,
  onPrint,
}: {
  ready: boolean;
  busy: boolean;
  onWord: () => void;
  onPrint: () => void;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  function run(action: () => void) {
    if (menu.current) menu.current.open = false;
    action();
  }
  return (
    <details ref={menu} className="relative shrink-0">
      <summary
        aria-label="Tải hợp đồng"
        className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 [&::-webkit-details-marker]:hidden"
      >
        <Download size={15} />
        <span className="hidden sm:inline">Tải hợp đồng</span>
      </summary>
      <div className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
        {!ready && (
          <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            <LockKeyhole size={15} className="mt-0.5 shrink-0" />
            Hợp đồng cần được chủ tổ chức duyệt trước khi tải.
          </p>
        )}
        <button
          type="button"
          disabled={!ready || busy}
          aria-label="Tải Word"
          onClick={() => run(onWord)}
          className="flex w-full items-center gap-3 rounded-lg p-3 text-left text-xs hover:bg-slate-50 disabled:opacity-40"
        >
          <FileText size={16} />
          <span>
            <strong className="block font-semibold">Tải Word</strong>
            <span className="mt-1 block text-[10px] text-slate-400">
              Tệp .docx có thể chỉnh sửa
            </span>
          </span>
        </button>
        <button
          type="button"
          disabled={!ready || busy}
          aria-label="In / lưu PDF"
          onClick={() => run(onPrint)}
          className="flex w-full items-center gap-3 rounded-lg p-3 text-left text-xs hover:bg-slate-50 disabled:opacity-40"
        >
          <Printer size={16} />
          <span>
            <strong className="block font-semibold">In / lưu PDF</strong>
            <span className="mt-1 block text-[10px] text-slate-400">
              Bao gồm phụ lục và ngắt trang
            </span>
          </span>
        </button>
      </div>
    </details>
  );
}
