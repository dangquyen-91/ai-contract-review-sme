"use client";

import { useEffect, useRef, useState } from "react";

export function OriginalContractPreview({ contractId, mimeType, fileName }: {
  contractId: string;
  mimeType: string;
  fileName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const isDocx = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const filePath = `/api/contracts/${contractId}/file`;

  useEffect(() => {
    if (!isDocx) return;
    const controller = new AbortController();
    const container = containerRef.current;
    if (!container) return;
    setError(false);
    container.replaceChildren();

    async function render() {
      const response = await fetch(filePath, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error("Cannot fetch original contract");
      const blob = await response.blob();
      const { renderAsync } = await import("docx-preview");
      if (controller.signal.aborted || !container) return;
      await renderAsync(blob, container, container, {
        breakPages: true,
        ignoreLastRenderedPageBreak: false,
        renderAltChunks: false,
      });
    }

    render().catch(() => {
      if (!controller.signal.aborted) setError(true);
    });
    return () => {
      controller.abort();
      container.replaceChildren();
    };
  }, [filePath, isDocx]);

  if (isDocx) {
    return <div className="h-full overflow-auto [background:#eef1f5] p-4 [@media_(max-width:_580px)]:p-2 [&_.docx-wrapper]:!p-0 [&_.docx-wrapper]:!bg-transparent [&_.docx]:shadow-[0_3px_18px_#17243d24]">
      {error && <p className="text-[#a53348] text-[length:12px] m-3">Không thể hiển thị file gốc. Hãy chọn “Văn bản phân tích” để xem nội dung.</p>}
      <div ref={containerRef} aria-label={fileName ?? "File hợp đồng gốc"} />
    </div>;
  }

  return <iframe
    title={fileName ?? "File hợp đồng gốc"}
    src={filePath}
    className="w-full h-full border-0"
  />;
}
