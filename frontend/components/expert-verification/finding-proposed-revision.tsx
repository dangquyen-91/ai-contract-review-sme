import type { RiskFinding } from "@/types/contracts";

export function FindingProposedRevision({ revision }: { revision?: RiskFinding["proposedRevision"] }) {
  if (!revision?.revisedText?.trim()) return null;
  return (
    <details className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-ui leading-6">
      <summary className="cursor-pointer font-medium text-primary">Xem đề xuất sửa điều khoản</summary>
      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <section className="min-w-0 rounded-lg border border-border bg-card p-3">
          <h4 className="m-0 text-ui-meta font-semibold text-muted-foreground">Nội dung gốc được đối chiếu</h4>
          <p className="mb-0 mt-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{revision.originalText?.trim() || "Chưa có đoạn gốc được liên kết; đây có thể là đề xuất bổ sung điều khoản."}</p>
        </section>
        <section className="min-w-0 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-950">
          <h4 className="m-0 text-ui-meta font-semibold">Nội dung đề xuất</h4>
          <p className="mb-0 mt-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{revision.revisedText}</p>
        </section>
      </div>
      {revision.reason && <p className="mb-0 mt-3 whitespace-pre-wrap break-words"><strong>Lý do:</strong> {revision.reason}</p>}
      <p className="mb-0 mt-3 text-ui-meta text-muted-foreground">Nội dung tham khảo từ đề xuất đã lưu. Việc xác minh rủi ro chưa thay đổi văn bản hợp đồng.</p>
    </details>
  );
}
