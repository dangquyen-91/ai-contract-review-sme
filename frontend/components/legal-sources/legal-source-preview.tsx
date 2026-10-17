import type { LegalSourcePreview as Preview } from "@/types/legal-sources";
import { LegalSourceCoverage } from "./legal-source-coverage";

export function LegalSourcePreview({ data }: { data: Preview }) {
  return <div className="space-y-4" aria-label="Kết quả xem trước">
    <LegalSourceCoverage coverage={data.coverage} />
    {data.documentNumber && <p>Số hiệu nhận diện: {data.documentNumber}</p>}
    <details className="rounded-xl border border-border p-4">
      <summary className="cursor-pointer font-semibold">Xem đoạn trích ({data.chunks.length})</summary>
      <ol className="mt-3 max-h-80 space-y-3 overflow-y-auto">{data.chunks.map((chunk) => <li key={chunk.order} className="rounded-lg bg-muted p-3">
        <strong>{chunk.articleRef || `Đoạn ${chunk.order + 1}`} {chunk.articleTitle}</strong>
        <p className="mt-2 whitespace-pre-wrap break-words text-ui leading-6">{chunk.preview}</p>
      </li>)}</ol>
    </details>
    <p className="text-ui-meta text-muted-foreground">Đây là bản xem trước, tài liệu chưa được lưu từ thao tác này.</p>
  </div>;
}
