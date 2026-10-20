import type { LegalSource } from "@/types/legal-sources";
import { formatLegalDate } from "./legal-source-ingestion-status";

export function LegalSourceParts({ parts }: { parts: LegalSource["parts"] }) {
  return <section className="rounded-xl border border-border bg-card p-5">
    <h2 className="text-ui-section font-semibold">Tài liệu đã tiếp nhận</h2>
    {!parts?.length ? <p className="mt-3 text-muted-foreground">Chưa có lịch sử tài liệu.</p> : <ul className="mt-4 divide-y divide-border">{parts.map((part, index) => <li key={`${part.uploadedAt}-${index}`} className="space-y-2 py-3 text-ui">
      <p className="break-words font-semibold">{part.fileName || `Tài liệu ${index + 1}`}</p>
      <p>{part.chunkCount} đoạn tham chiếu{part.articleFrom !== undefined ? ` · Điều ${part.articleFrom}–${part.articleTo ?? part.articleFrom}` : ""}</p>
      <p className="text-muted-foreground">{formatLegalDate(part.uploadedAt)}</p>
      {!!part.skippedArticles?.length && <p className="text-amber-800">Điều trùng đã bỏ qua: {part.skippedArticles.join(", ")}</p>}
    </li>)}</ul>}
  </section>;
}
