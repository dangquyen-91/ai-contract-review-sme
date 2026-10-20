"use client";

import { Button } from "@/components/ui/button";

import { useEffect, useRef, useState } from "react";
import { useContractFile } from "@/hooks/use-contracts";

function normalizeText(value: string) {
  return value.normalize("NFKC").replace(/[\u00ad\u200b-\u200d\ufeff]/g, "").replace(/\s+/g, " ").trim();
}

export function OriginalContractPreview({ contractId, mimeType, fileName, target, version, redacted = false, onTextFallback }: {
  contractId: string;
  mimeType: string;
  fileName?: string;
  target?: { text: string; requestId: number } | null;
  version?: string;
  redacted?: boolean;
  onTextFallback?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [locationNotFound, setLocationNotFound] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const isDocx = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const fileQuery = useContractFile(contractId, version, redacted);
  const blob = fileQuery.isError ? undefined : fileQuery.data;
  const error = fileQuery.isError || renderError;

  useEffect(() => {
    const controller = new AbortController();
    const container = containerRef.current;
    let objectUrl: string | undefined;
    if (isDocx && !container) return;
    setRenderError(false);
    setRendered(false);
    setLocationNotFound(false);
    setFileUrl(null);
    container?.replaceChildren();

    async function render() {
      if (!blob || controller.signal.aborted) return;
      if (!isDocx) {
        objectUrl = URL.createObjectURL(new Blob([blob], { type: mimeType }));
        setFileUrl(objectUrl);
        setRendered(true);
        return;
      }
      const { renderAsync } = await import("docx-preview");
      if (controller.signal.aborted || !container) return;
      const staging = document.createElement("div");
      await renderAsync(blob, staging, staging, {
        breakPages: true,
        ignoreLastRenderedPageBreak: false,
        renderAltChunks: false,
      });
      if (!controller.signal.aborted) {
        container.replaceChildren(...Array.from(staging.childNodes));
        setRendered(true);
      }
    }

    render().catch(() => {
      if (!controller.signal.aborted) setRenderError(true);
    });
    return () => {
      controller.abort();
      container?.replaceChildren();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [blob, isDocx, mimeType, attempt]);

  useEffect(() => {
    if (redacted || !isDocx || !rendered || !target || !containerRef.current) return;
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
  }, [redacted, isDocx, rendered, target]);

  const errorMessage = error && <div role="alert" className="m-4 rounded-xl border border-[#e4e8ef] bg-white p-5 text-ui text-[#607087]">
    <p className="m-0">{redacted ? "Chưa thể hiển thị bản DOCX đã che. Tài liệu chứa ảnh hoặc nội dung nhúng có thể chưa được hỗ trợ. Bạn có thể xem văn bản đã che." : "Không thể hiển thị file gốc. Bạn vẫn có thể chọn “Văn bản đầy đủ” để xem nội dung."}</p>
    {redacted && onTextFallback && <Button variant="outline" size="sm" type="button" onClick={onTextFallback} className="mt-3 mr-2">Xem văn bản đã che</Button>}
    <Button variant="outline" size="sm" type="button" disabled={fileQuery.isFetching} onClick={() => { void fileQuery.refetch().then((response) => { if (!response.isError) setAttempt((value) => value + 1); }); }} className="mt-3">{fileQuery.isFetching ? "Đang tải lại…" : "Thử tải lại file"}</Button>
  </div>;
  const loadingMessage = !error && !rendered && <p role="status" className="m-4 text-ui text-[#607087]">{redacted ? "Đang chuẩn bị bản DOCX đã che…" : "Đang tải file gốc…"}</p>;

  if (isDocx) {
    return <div className="h-full overflow-auto [background:#eef1f5] p-4 [@media_(max-width:_580px)]:p-2 [&_.docx-wrapper]:!p-0 [&_.docx-wrapper]:!bg-transparent [&_.docx]:shadow-[0_3px_18px_#17243d24]">
      {errorMessage}
      {loadingMessage}
      {locationNotFound && !error && <p className="text-[#875c08] text-ui m-3">Không tìm thấy vị trí điều khoản trong file gốc. Bạn có thể xem trong “Văn bản đầy đủ”.</p>}
      <div ref={containerRef} aria-label={redacted ? "Bản DOCX đã che thông tin" : fileName ?? "File hợp đồng gốc"} />
    </div>;
  }

  if (error || !fileUrl) return <div className="h-full overflow-auto bg-[#eef1f5]">{errorMessage}{loadingMessage}</div>;

  return <iframe
    title={fileName ?? "File hợp đồng gốc"}
    src={fileUrl}
    className="w-full h-full border-0"
  />;
}
