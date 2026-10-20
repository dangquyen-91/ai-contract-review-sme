import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";
import { ingestionStatuses } from "@/config/legal-source-display";
import type { LegalSource } from "@/types/legal-sources";

export function LegalSourceStatusBadge({ ingestion }: { ingestion?: LegalSource["ingestion"] }) {
  if (!ingestion) return <Badge variant="neutral">Chưa có trạng thái</Badge>;
  const status = ingestion.status;
  return <Badge variant={status === "completed" ? "success" : status === "failed" ? "danger" : status === "paused" ? "warning" : "info"}>{ingestionStatuses[status]}</Badge>;
}

export function LegalSourceIngestionStatus({ ingestion, actions }: { ingestion?: LegalSource["ingestion"]; actions?: ReactNode }) {
  return <section className="space-y-3 rounded-xl border border-border bg-card p-5" aria-label="Tiến trình xử lý">
    <h2 className="text-ui-section font-semibold">Tiến trình xử lý</h2>
    <div role="status"><LegalSourceStatusBadge ingestion={ingestion} />{ingestion && <p className="mt-3 text-ui">Đã xử lý {ingestion.embeddedChunks}/{ingestion.totalChunks} đoạn tham chiếu.</p>}</div>
    {ingestion && ingestion.totalChunks > 0 && <progress className="h-2 w-full accent-primary" max={ingestion.totalChunks} value={ingestion.embeddedChunks} aria-label="Số đoạn đã xử lý" />}
    {ingestion?.error && <p className="break-words text-ui text-destructive">{ingestion.error}</p>}
    {ingestion?.resumeAt && <p className="text-ui text-muted-foreground">Thời điểm dự kiến tiếp tục: {formatLegalDate(ingestion.resumeAt)}</p>}
    <p className="text-ui-meta text-muted-foreground">Trạng thái tự cập nhật khi tác vụ đang chờ, đang xử lý hoặc tạm dừng. Bạn có thể quay lại trang này để theo dõi.</p>
    {ingestion?.status !== "completed" && <p className="text-ui-meta text-muted-foreground">Nếu tiến trình bị gián đoạn, chọn “Tiếp tục xử lý”. Hệ thống sẽ kiểm tra và không tạo thêm tác vụ nếu quá trình hiện tại vẫn đang chạy.</p>}
    {actions && <div className="border-t border-border pt-3">{actions}</div>}
  </section>;
}

export function formatLegalDate(value?: string) {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";
}
