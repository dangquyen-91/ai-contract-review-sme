import { verificationDate } from "@/lib/review/verification-display";
import type { ExpertVerification } from "@/types/expert-verification";

export function VerificationRequestInfo({ verification }: { verification: ExpertVerification }) {
  return (
    <details className="text-ui">
      <summary className="cursor-pointer text-ui-meta font-medium text-primary">Thông tin yêu cầu</summary>
      <div className="mt-3 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
        <dl className="m-0 grid gap-2 text-ui-meta sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Người gửi</dt><dd className="m-0 font-medium">{typeof verification.requestedBy === "object" ? verification.requestedBy?.name ?? "Người gửi" : "Người gửi"}</dd></div>
          <div><dt className="text-muted-foreground">Thời gian gửi</dt><dd className="m-0">{verificationDate(verification.requestedAt)}</dd></div>
          <div><dt className="text-muted-foreground">Lần gửi</dt><dd className="m-0">{verification.attempt}</dd></div>
          {verification.completedAt && <div><dt className="text-muted-foreground">Kết thúc</dt><dd className="m-0">{verificationDate(verification.completedAt)}</dd></div>}
        </dl>
        <p className="m-0 whitespace-pre-wrap break-words text-ui-meta"><strong>Ghi chú người gửi:</strong> {verification.requestNote || "Không có ghi chú."}</p>
        {verification.decisionNote && <p className="m-0 whitespace-pre-wrap break-words text-ui-meta"><strong>Kết luận / lý do trả lại:</strong> {verification.decisionNote}</p>}
      </div>
    </details>
  );
}
