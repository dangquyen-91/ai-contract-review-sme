"use client";

import { useEffect, useRef, useState } from "react";

function normalizeText(value: string) {
  return value.normalize("NFKC").replace(/[\u00ad\u200b-\u200d\ufeff]/g, "").replace(/\s+/g, " ").trim();
}

export function OriginalContractPreview({ contractId, mimeType, fileName, target }: {
  contractId: string;
  mimeType: string;
  fileName?: string;
  target?: { text: string; requestId: number } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [locationNotFound, setLocationNotFound] = useState(false);
  const isDocx = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const filePath = `/api/contracts/${contractId}/file`;

  useEffect(() => {
    if (!isDocx) return;
    const controller = new AbortController();
    const container = containerRef.current;
    if (!container) return;
    setError(false);
    setRendered(false);
    setLocationNotFound(false);
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
      if (!controller.signal.aborted) setRendered(true);
    }

    render().catch(() => {
      if (!controller.signal.aborted) setError(true);
    });
    return () => {
      controller.abort();
      container.replaceChildren();
    };
  }, [filePath, isDocx]);

  useEffect(() => {
    if (!isDocx || !rendered || !target || !containerRef.current) return;
    const container = containerRef.current;
    const paragraphs = Array.from(container.querySelectorAll<HTMLElement>("p"));
    const lines = target.text.split(/\r?\n/).map(normalizeText).filter((line) => line.length >= 8).slice(0, 8);
    const paragraph = lines.reduce<HTMLElement | undefined>((match, line) =>
      match ?? paragraphs.find((item) => normalizeText(item.textContent ?? "").includes(line.slice(0, 120))), undefined);

    if (!paragraph) {
      setLocationNotFound(true);
      return;
    }

    setLocationNotFound(false);
    const previousBackground = paragraph.style.backgroundColor;
    const previousOutline = paragraph.style.outline;
    const previousScrollMargin = paragraph.style.scrollMarginBlock;
    paragraph.style.backgroundColor = "#fff0bf";
    paragraph.style.outline = "4px solid #fff0bf";
    paragraph.style.scrollMarginBlock = "35px";
    paragraph.scrollIntoView({ behavior: "smooth", block: "center" });
    return () => {
      paragraph.style.backgroundColor = previousBackground;
      paragraph.style.outline = previousOutline;
      paragraph.style.scrollMarginBlock = previousScrollMargin;
    };
  }, [isDocx, rendered, target]);

  if (isDocx) {
    return <div className="h-full overflow-auto [background:#eef1f5] p-4 [@media_(max-width:_580px)]:p-2 [&_.docx-wrapper]:!p-0 [&_.docx-wrapper]:!bg-transparent [&_.docx]:shadow-[0_3px_18px_#17243d24]">
      {error && <p className="text-[#a53348] text-[length:12px] m-3">Không thể hiển thị file gốc. Hãy chọn “Văn bản phân tích” để xem nội dung.</p>}
      {locationNotFound && !error && <p className="text-[#875c08] text-[length:12px] m-3">Không tìm thấy vị trí điều khoản trong file gốc. Bạn có thể xem trong “Văn bản phân tích”.</p>}
      <div ref={containerRef} aria-label={fileName ?? "File hợp đồng gốc"} />
    </div>;
  }

  return <iframe
    title={fileName ?? "File hợp đồng gốc"}
    src={filePath}
    className="w-full h-full border-0"
  />;
}
