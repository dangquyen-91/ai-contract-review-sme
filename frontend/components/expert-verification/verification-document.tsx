"use client";

import { useEffect, useRef } from "react";
import { ShieldCheck } from "lucide-react";
import type { ExpertWorkspace } from "@/types/verification-workspace";

export function VerificationDocument({ workspace, selection }: { workspace: ExpertWorkspace; selection: { index: number; request: number } | null }) {
  const target = useRef<HTMLElement | null>(null);
  const clause = selection ? workspace.clauses.find((item) => item.index === selection.index) : undefined;
  const quote = clause?.text.trim() ?? "";
  // Original offsets refer to unredacted text. Search only within the redacted
  // workspace instead of applying those offsets to a different document.
  const index = quote ? workspace.document.text.indexOf(quote) : -1;
  useEffect(() => {
    if (!selection || !target.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.current.scrollIntoView({ block: "center", behavior: reduced ? "instant" : "smooth" });
    target.current.focus({ preventScroll: true });
  }, [selection, index]);
  return (
    <>
      <header className="shrink-0 border-b border-border p-4">
        <h2 className="m-0 text-ui-section font-semibold">Nội dung hợp đồng</h2>
        <p className="mb-0 mt-2 flex items-start gap-2 text-ui-meta leading-5 text-muted-foreground"><ShieldCheck className="size-4 shrink-0" aria-hidden="true" />Bản văn bản đã che thông tin được hệ thống nhận diện. Việc nhận diện có thể chưa bao phủ hết dữ liệu.</p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        {!workspace.document.text.trim() ? <p role="status" className="text-ui text-muted-foreground">Chưa có văn bản để đối chiếu. Hãy làm mới; hệ thống không tự mở file gốc.</p> : (
          <div className="whitespace-pre-wrap break-words font-serif text-ui-document leading-8 text-card-foreground [overflow-wrap:anywhere]">
            {index >= 0 ? <>{workspace.document.text.slice(0, index)}<mark ref={target} tabIndex={-1} className="rounded bg-amber-100 text-amber-950 outline-none focus:ring-2 focus:ring-amber-400">{quote}</mark>{workspace.document.text.slice(index + quote.length)}</> : workspace.document.text}
          </div>
        )}
        {clause && index < 0 && <section ref={target} tabIndex={-1} className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 outline-none focus:ring-2 focus:ring-amber-400"><h3 className="m-0 text-ui font-semibold">{clause.title || `Điều khoản ${clause.index}`}</h3><p className="mt-2 text-ui-meta text-amber-950">Chưa định vị được chính xác trong văn bản. Nội dung điều khoản đã che để đối chiếu:</p><p className="mb-0 whitespace-pre-wrap break-words text-ui leading-7">{clause.text}</p></section>}
      </div>
    </>
  );
}
