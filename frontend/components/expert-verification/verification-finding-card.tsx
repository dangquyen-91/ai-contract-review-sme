"use client";

import { Button } from "@/components/ui/button";
import { riskCodeLabels } from "@/config/risk-display";
import { findingVerdictLabels } from "@/lib/review/verification-workspace";
import type { VerifiedFinding } from "@/types/verification-workspace";
import { FindingProposedRevision } from "./finding-proposed-revision";

const severity = { high: { label: "Rủi ro cao", tone: "border-rose-200 bg-rose-50 text-rose-900" }, medium: { label: "Rủi ro trung bình", tone: "border-amber-200 bg-amber-50 text-amber-950" }, low: { label: "Rủi ro thấp", tone: "border-blue-200 bg-blue-50 text-blue-950" } };

export function VerificationFindingCard({ finding, editable, readOnly = false, onConfirm, onEdit, onReject, onRemove, onLocate }: {
  finding: VerifiedFinding;
  editable: boolean;
  readOnly?: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  onReject: () => void;
  onRemove: () => void;
  onLocate: () => void;
}) {
  const tone = severity[finding.severity];
  const expertAdded = finding.detectedBy === "expert";
  return (
    <article className={`min-w-0 rounded-xl border bg-card p-4 ${finding.verification?.verdict === "rejected" ? "border-border" : tone.tone.split(" ")[0]}`}>
      <div className="flex flex-wrap items-center gap-2 text-ui-meta">
        <span className={`rounded-md border px-2 py-0.5 font-semibold ${tone.tone}`}>{tone.label}</span>
        <span className="rounded-md bg-muted px-2 py-0.5 text-card-foreground">{finding.verification ? findingVerdictLabels[finding.verification.verdict] : "Chưa xử lý"}</span>
      </div>
      <h3 className="mb-0 mt-3 break-words text-ui-section font-semibold leading-6 [overflow-wrap:anywhere]">{finding.title}</h3>
      {finding.riskCode && <p className="mb-0 mt-1 text-ui-meta text-muted-foreground">{riskCodeLabels[finding.riskCode]}</p>}
      <ul className="mb-0 mt-2 space-y-1 pl-5 text-ui leading-6">{finding.problem.map((point, index) => <li key={index} className="break-words [overflow-wrap:anywhere]">{point}</li>)}</ul>
      {finding.clause && <Button variant="link" size="sm" className="mt-2 h-auto max-w-full whitespace-normal px-0 text-left" onClick={onLocate}>{finding.clause.title || `Điều khoản ${finding.clause.index}`} → Xem vị trí</Button>}
      <details className="mt-3 rounded-lg border border-border p-3 text-ui leading-6">
        <summary className="cursor-pointer font-medium text-primary">Phân tích và căn cứ</summary>
        <div className="mt-3 space-y-3">
          {[{ label: "Hậu quả", points: finding.consequences }, { label: "Khuyến nghị", points: finding.recommendations }, { label: "Căn cứ tham chiếu", points: finding.legalBasis?.map((basis) => basis.text) ?? [] }].map(({ label, points }) => (
            <section key={label}><h4 className="m-0 text-ui font-semibold">{label}</h4>{points.length ? <ul className="mb-0 mt-1 space-y-1 pl-5">{points.map((point, index) => <li key={index} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{point}</li>)}</ul> : <p className="mb-0 mt-1 text-muted-foreground">Chưa có nội dung.</p>}</section>
          ))}
          {finding.citations?.map((citation, index) => <details key={index} className="rounded border border-border p-2"><summary className="cursor-pointer text-primary">{citation.citationLabel} {citation.articleRef}</summary><p className="mb-0 mt-2 whitespace-pre-wrap break-words">{citation.chunkText}</p></details>)}
        </div>
      </details>
      <FindingProposedRevision revision={finding.proposedRevision} />
      {finding.verification?.reason && <p className="mb-0 mt-3 whitespace-pre-wrap break-words text-ui leading-6"><strong>Lý do xử lý:</strong> {finding.verification.reason}</p>}
      {!readOnly && <div className="mt-4 flex flex-wrap gap-2">
        {!expertAdded && <Button size="sm" variant="secondary" disabled={!editable || finding.verification?.verdict === "confirmed"} onClick={onConfirm}>Xác nhận</Button>}
        <Button size="sm" variant="outline" disabled={!editable} onClick={onEdit}>Điều chỉnh</Button>
        {expertAdded ? <Button size="sm" variant="ghost" disabled={!editable} onClick={onRemove}>Xóa rủi ro bổ sung</Button> : <Button size="sm" variant="ghost" disabled={!editable || finding.verification?.verdict === "rejected"} onClick={onReject}>Bác bỏ</Button>}
      </div>}
    </article>
  );
}
