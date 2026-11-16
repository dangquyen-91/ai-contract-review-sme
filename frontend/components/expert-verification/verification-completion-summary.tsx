import { verificationSummary } from "@/lib/review/verification-summary";
import type { VerifiedFinding } from "@/types/verification-workspace";

export function VerificationCompletionSummary({ findings }: { findings: VerifiedFinding[] }) {
  const totals = verificationSummary(findings);
  return (
    <section aria-label="Tổng kết kiểm tra" className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
      <h3 className="m-0 text-ui font-semibold">Tổng kết trước khi hoàn tất</h3>
      <dl className="m-0 grid grid-cols-2 gap-2 text-ui-meta">
        {([{ key: "confirmed", label: "Xác nhận" }, { key: "adjusted", label: "Điều chỉnh" }, { key: "rejected", label: "Bác bỏ" }, { key: "added", label: "Bổ sung" }] as const).map(({ key, label }) => (
          <div key={key} className="rounded-lg border border-border bg-card p-3"><dt className="text-muted-foreground">{label}</dt><dd className="mb-0 ml-0 mt-1 text-ui-section font-bold tabular-nums">{totals[key]}</dd></div>
        ))}
      </dl>
      <p className="m-0 text-ui-meta">Rủi ro còn được giữ lại: <strong className="text-rose-800">{totals.high} cao</strong> · <strong className="text-amber-900">{totals.medium} trung bình</strong> · <strong className="text-blue-800">{totals.low} thấp</strong>.</p>
      {totals.pending > 0 && <p role="alert" className="m-0 text-ui-meta text-rose-800">Còn {totals.pending} mục chưa xử lý. Kiểm tra lại trước khi hoàn tất.</p>}
      <p className="m-0 text-ui-meta text-muted-foreground">Hoàn tất kiểm tra không có nghĩa hợp đồng không còn rủi ro. Các mục bị bác bỏ được giữ trong lịch sử, không tính vào số rủi ro trên.</p>
    </section>
  );
}
