"use client";

import { Button } from "@/components/ui/button";

import { Icon } from "@/components/ui/icon";
import type { ContractTextResult } from "@/types/contracts";

function documentParts(data: ContractTextResult) {
  const parts = [];
  let cursor = 0;
  for (const span of data.redactionSpans ?? []) {
    if (!Number.isInteger(span.start) || !Number.isInteger(span.end) || span.start < cursor || span.end <= span.start || span.end > data.text.length) continue;
    parts.push(data.text.slice(cursor, span.start).replace(/\n{3,}/g, "\n\n"));
    parts.push(<span key={span.start} className="text-[#64748b]">{data.text.slice(span.start, span.end)}</span>);
    cursor = span.end;
  }
  parts.push(data.text.slice(cursor).replace(/\n{3,}/g, "\n\n"));
  return parts;
}

export function RedactedDocument({ data, isPending, isError, isFetching, onRetry }: {
  data?: ContractTextResult;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  onRetry: () => void;
}) {
  if (isPending) return <div role="status" className="flex items-center gap-3 rounded-xl border border-[#dce5f2] bg-[#f8faff] p-5 text-ui text-[#536881]">
    <Icon name="shield" className="h-5 w-5 shrink-0" />Đang tải bản ẩn một phần…
  </div>;

  // Never fall back to the original text on a failed or unexpected response.
  if (isError || !data || data.redacted !== true || data.redactionMode !== "partial") return <div role="alert" className="rounded-xl border border-[#f0d5aa] bg-[#fffbf3] p-5 text-ui leading-6 text-[#79581b]">
    <p className="m-0 font-semibold">Chưa tải được bản ẩn một phần</p>
    <p className="mb-0 mt-1">Hãy thử tải lại. Nội dung đầy đủ không được tự động hiển thị trong chế độ này.</p>
    <Button variant="outline" size="sm" type="button" disabled={isFetching} onClick={onRetry} className="mt-3">{isFetching ? "Đang tải lại…" : "Tải lại bản ẩn một phần"}</Button>
  </div>;

  if (!data.text.trim()) return <p role="status" className="m-0 text-ui leading-6 text-[#607087]">Chưa có văn bản trích xuất để hiển thị bản ẩn một phần.</p>;

  const unchanged = data.redactionSpans?.length === 0;
  return <>
    <div className="mb-5 flex items-start gap-2 border-b border-[#e4e8ef] pb-3 text-ui leading-6 text-[#607087]">
      <Icon name="shield" className="mt-0.5 h-5 w-5 shrink-0" />
      <div><p className="m-0 font-semibold">{unchanged ? "Không có thay đổi so với văn bản đầy đủ" : "Thông tin được ẩn để đối chiếu nội bộ"}</p>
        {unchanged && <p className="mb-0 mt-1">Chưa có thông tin được thay thế theo cấu hình hiện tại. Điều này không khẳng định hợp đồng không có dữ liệu nhạy cảm.</p>}
      </div>
    </div>
    <div className="whitespace-pre-wrap text-[#263750] [font-family:Georgia,'Times_New_Roman',serif] text-ui-document leading-[1.85] [overflow-wrap:anywhere]">
      {documentParts(data)}
    </div>
  </>;
}
