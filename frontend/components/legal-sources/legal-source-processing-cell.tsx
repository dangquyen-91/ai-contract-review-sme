import { TriangleAlert } from "lucide-react";
import type { LegalSource } from "@/types/legal-sources";
import { matchesSourceGroup } from "@/lib/legal-source-filtering";
import { LegalSourceStatusBadge } from "./legal-source-ingestion-status";

export function LegalSourceProcessingCell({ source }: { source: LegalSource }) {
  const ingestion = source.ingestion;
  return <div className="min-w-44 max-w-64 space-y-2">
    <LegalSourceStatusBadge ingestion={ingestion} />
    {ingestion && ingestion.totalChunks > 0 && <div>
      <p className="text-ui-meta tabular-nums text-muted-foreground">{ingestion.embeddedChunks.toLocaleString("vi-VN")} / {ingestion.totalChunks.toLocaleString("vi-VN")} đoạn</p>
      {ingestion.status !== "completed" && <progress className="mt-1 h-1.5 w-full accent-primary" max={ingestion.totalChunks} value={Math.min(ingestion.totalChunks, Math.max(0, ingestion.embeddedChunks))} aria-label={`Tiến trình xử lý ${source.title}`} />}
    </div>}
    {ingestion?.error && <p className="line-clamp-2 break-words text-ui-meta text-destructive" title={ingestion.error}>{ingestion.error}</p>}
    {matchesSourceGroup(source, "coverage") && <p className="flex items-start gap-1.5 text-ui-meta text-amber-800"><TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />Cần kiểm tra độ đầy đủ</p>}
  </div>;
}
