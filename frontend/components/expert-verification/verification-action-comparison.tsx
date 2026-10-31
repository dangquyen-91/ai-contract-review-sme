import { riskCodeLabels } from "@/config/risk-display";
import { verificationSnapshotChanges } from "@/lib/review/verification-findings";
import type { VerificationAction, VerificationFindingInput } from "@/types/verification-workspace";

const severities = { high: "Cao", medium: "Trung bình", low: "Thấp" };

function SnapshotValue({ field, snapshot }: { field: keyof VerificationFindingInput; snapshot?: Partial<VerificationFindingInput> | null }) {
  const value = snapshot?.[field];
  if (value === undefined || value === null) return <p className="mb-0 mt-1 text-muted-foreground">Không có dữ liệu.</p>;
  if (Array.isArray(value)) return value.length
    ? <ul className="mb-0 mt-1 list-disc space-y-1 pl-4">{value.map((point, index) => <li key={index} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{point}</li>)}</ul>
    : <p className="mb-0 mt-1 text-muted-foreground">Không có nội dung.</p>;
  const label = field === "severity" ? severities[value as keyof typeof severities] ?? value
    : field === "riskCode" ? riskCodeLabels[value as keyof typeof riskCodeLabels] ?? value : value;
  return <p className="mb-0 mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{label}</p>;
}

export function VerificationActionComparison({ action }: { action: VerificationAction }) {
  const changes = verificationSnapshotChanges(action.before, action.after);
  if (!action.before && !action.after) return <p className="mb-0 mt-2 text-ui-meta text-muted-foreground">Chưa có snapshot nội dung cho thao tác này.</p>;
  if (!changes.length) return <p className="mb-0 mt-2 text-ui-meta text-muted-foreground">Nội dung rủi ro không thay đổi trong thao tác này.</p>;
  return (
    <details className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
      <summary className="cursor-pointer text-ui-meta font-semibold text-primary">Xem nội dung trước / sau ({changes.length} mục)</summary>
      {action.action === "add" && <p className="mb-0 mt-2 text-ui-meta text-muted-foreground">Rủi ro mới được bổ sung; chưa có nội dung trước thao tác.</p>}
      {action.action === "remove" && <p className="mb-0 mt-2 text-ui-meta text-muted-foreground">Rủi ro bổ sung đã bị xóa; giữ lại nội dung trước thao tác để đối chiếu.</p>}
      <div className="mt-3 space-y-4">
        {changes.map(({ key, label }) => (
          <section key={key}>
            <h4 className="m-0 text-ui font-semibold">{label}</h4>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <div className="min-w-0 rounded-lg border border-border bg-card p-3"><p className="m-0 text-ui-caption font-semibold text-muted-foreground">Trước</p><SnapshotValue field={key} snapshot={action.before} /></div>
              <div className="min-w-0 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-950"><p className="m-0 text-ui-caption font-semibold">Sau</p><SnapshotValue field={key} snapshot={action.after} /></div>
            </div>
          </section>
        ))}
      </div>
    </details>
  );
}
