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
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const isDocx = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const filePath = `/api/contracts/${contractId}/file`;

  useEffect(() => {
    const controller = new AbortController();
    const container = containerRef.current;
    let objectUrl: string | undefined;
    if (isDocx && !container) return;
    setError(false);
    setRendered(false);
    setLocationNotFound(false);
    setFileUrl(null);
    container?.replaceChildren();

    async function render() {
      const response = await fetch(filePath, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error("Cannot fetch original contract");
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      if (!isDocx) {
        objectUrl = URL.createObjectURL(new Blob([blob], { type: mimeType }));
        setFileUrl(objectUrl);
        setRendered(true);
        return;
      }
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
      container?.replaceChildren();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [filePath, isDocx, mimeType, attempt]);

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

  const errorMessage = error && <div role="alert" className="m-4 rounded-xl border border-[#e4e8ef] bg-white p-5 text-[length:12px] text-[#607087]">
    <p className="m-0">Không thể hiển thị file gốc. Bạn vẫn có thể chọn “Văn bản phân tích” để xem nội dung.</p>
    <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-3 rounded-lg border border-[#aac7fa] bg-[#eaf1ff] px-3 py-2 font-semibold text-[#1e53b8]">Thử tải lại file</button>
  </div>;
  const loadingMessage = !error && !rendered && <p role="status" className="m-4 text-[length:12px] text-[#607087]">Đang tải file gốc…</p>;

  if (isDocx) {
    return <div className="h-full overflow-auto [background:#eef1f5] p-4 [@media_(max-width:_580px)]:p-2 [&_.docx-wrapper]:!p-0 [&_.docx-wrapper]:!bg-transparent [&_.docx]:shadow-[0_3px_18px_#17243d24]">
      {errorMessage}
      {loadingMessage}
      {locationNotFound && !error && <p className="text-[#875c08] text-[length:12px] m-3">Không tìm thấy vị trí điều khoản trong file gốc. Bạn có thể xem trong “Văn bản phân tích”.</p>}
      <div ref={containerRef} aria-label={fileName ?? "File hợp đồng gốc"} />
    </div>;
  }

  if (error || !fileUrl) return <div className="h-full overflow-auto bg-[#eef1f5]">{errorMessage}{loadingMessage}</div>;

  return <iframe
    title={fileName ?? "File hợp đồng gốc"}
    src={fileUrl}
    className="w-full h-full border-0"
  />;
}
