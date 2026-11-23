import { verificationSummary } from "@/lib/review/verification-summary";
import type { VerifiedFinding } from "@/types/verification-workspace";
import { IssueSummary } from "@/components/review/results/issue-summary";

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
      <IssueSummary counts={totals.issues} />
      {totals.pending > 0 && <p role="alert" className="m-0 text-ui-meta text-rose-800">Còn {totals.pending} mục chưa xử lý. Kiểm tra lại trước khi hoàn tất.</p>}
      <p className="m-0 text-ui-meta leading-6 text-muted-foreground">Hoàn tất kiểm tra không có nghĩa đã kiểm tra mọi vấn đề của hợp đồng. Các mục bị bác bỏ được giữ trong lịch sử và không tính vào số vấn đề trên.</p>
    </section>
  );
}
