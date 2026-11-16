import type { FindingVerification } from "@/types/contracts";
import { verificationDate } from "@/lib/review/verification-display";

const verdicts = {
  confirmed: { label: "Chuyên gia xác nhận", tone: "border-emerald-200 bg-emerald-50 text-emerald-900" },
  adjusted: { label: "Chuyên gia điều chỉnh", tone: "border-blue-200 bg-blue-50 text-blue-950" },
  rejected: { label: "Chuyên gia bác bỏ", tone: "border-slate-200 bg-slate-100 text-slate-700" },
  added: { label: "Chuyên gia bổ sung", tone: "border-violet-200 bg-violet-50 text-violet-950" },
};

export function FindingVerificationBadge({ verification }: { verification?: FindingVerification | null }) {
  if (!verification || !verdicts[verification.verdict]) return null;
  const verdict = verdicts[verification.verdict];
  return <span data-verification-verdict={verification.verdict} className={`inline-flex w-fit rounded-md border px-2 py-1 text-ui-caption font-semibold ${verdict.tone}`}>{verdict.label}</span>;
}

export function FindingVerificationInfo({ verification, severity }: { verification?: FindingVerification | null; severity: "high" | "medium" | "low" }) {
  if (!verification) return null;
  const levels = { high: "Cao", medium: "Trung bình", low: "Thấp" };
  const changedSeverity = verification.originalSeverity && verification.originalSeverity !== severity;
  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-ui-meta leading-6 text-card-foreground">
      {verification.verdict === "rejected" && <p className="m-0">Mục này được giữ để đối chiếu và không tính vào số rủi ro đang áp dụng.</p>}
      {changedSeverity && <p className="m-0">Mức rủi ro: <strong>{levels[verification.originalSeverity!]} → {levels[severity]}</strong></p>}
      {verification.reason && <p className="mb-0 mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]"><strong>Lý do xử lý:</strong> {verification.reason}</p>}
      {verification.verifiedAt && <p className="mb-0 mt-1 text-muted-foreground">Xử lý lúc {verificationDate(verification.verifiedAt)}</p>}
      <p className="mb-0 mt-1 text-muted-foreground">Đây là trạng thái từng mục; xem yêu cầu chuyên gia để biết tiến trình xác minh tổng thể.</p>
    </div>
  );
}
