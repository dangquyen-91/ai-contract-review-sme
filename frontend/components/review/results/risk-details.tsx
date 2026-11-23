"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { isApiClientError } from "@/lib/api/client";
import { useRemoveProposedRevisionMutation, useUpdateProposedRevisionMutation } from "@/hooks/contracts/use-contracts";
import type { ContractQuote, ContractReviewResult, RiskFinding } from "@/types/contracts";
import { clauseLabel } from "@/lib/review/clause-label";
import styles from "@/styles/review/review-design.module.css";

function errorMessage(error: unknown) {
  return isApiClientError(error) ? error.message : "Vui lòng thử lại sau.";
}

function DetailList({ title, points, recommendation = false }: { title: string; points?: string[]; recommendation?: boolean }) {
  if (!points?.length) return null;
  return (
    <section className={recommendation ? styles.recommendation : undefined}>
      <h4>{title}</h4>
      <ul>{points.map((point, index) => <li key={index} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{point}</li>)}</ul>
    </section>
  );
}

export function RiskDetails({ contractId, finding, clauses, allowProposalEditing = false, onSource }: {
  contractId?: string;
  finding: RiskFinding;
  clauses?: ContractReviewResult["clauses"];
  allowProposalEditing?: boolean;
  onSource?: (source: ContractQuote) => void;
}) {
  const findingId = finding.id ?? finding._id;
  const [editing, setEditing] = useState(false);
  const [revisedText, setRevisedText] = useState(finding.proposedRevision?.revisedText ?? "");
  const [reason, setReason] = useState(finding.proposedRevision?.reason ?? "");
  const update = useUpdateProposedRevisionMutation();
  const remove = useRemoveProposedRevisionMutation();
  const busy = update.isPending || remove.isPending;
  const fieldClass = "w-full min-w-0 resize-y rounded-md border border-[#d8ddd1] bg-white p-3 text-ui-meta font-normal leading-7 text-[#292c28] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315eac]";

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contractId || !findingId || !revisedText.trim()) return;
    try {
      await update.mutateAsync({ contractId, findingId, update: { revisedText: revisedText.trim(), ...(reason.trim() ? { reason: reason.trim() } : {}) } });
      setEditing(false);
      toast.success("Đã lưu đề xuất chỉnh sửa");
    } catch (error) {
      toast.error("Chưa thể lưu đề xuất", { description: errorMessage(error) });
    }
  }

  async function discard() {
    if (!contractId || !findingId) return;
    try {
      await remove.mutateAsync({ contractId, findingId });
      setEditing(false);
      toast.success("Đã bỏ đề xuất chỉnh sửa");
    } catch (error) {
      toast.error("Chưa thể bỏ đề xuất", { description: errorMessage(error) });
    }
  }

  return (
    <div className={styles.details}>
      {!!finding.evidence?.length && (
        <section>
          <h4>Bằng chứng trong hợp đồng</h4>
          {finding.evidence.map((item, index) => (
            <div key={index} className={styles.detailQuote}>
              {item.label && <p className="m-0 text-[11px] font-medium text-[#73766f]">{item.label}</p>}
              {item.quote && <blockquote className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">“{item.quote}”</blockquote>}
              {item.value != null && <p className="mb-0 mt-1 text-xs text-[#73766f]">Giá trị ghi nhận: {typeof item.value === "boolean" ? item.value ? "Có" : "Không" : String(item.value)}</p>}
              {item.quote && item.clauseIndex != null && onSource && (
                <button type="button" className={`${styles.textAction} mt-1`} onClick={() => onSource({ quote: item.quote!, clauseIndex: item.clauseIndex!, startOffset: item.startOffset, endOffset: item.endOffset })}>
                  Xem vị trí · {clauseLabel(clauses?.find((clause) => clause.index === item.clauseIndex)
                    ?? (finding.clause?.index === item.clauseIndex ? finding.clause : { index: item.clauseIndex }))} <span aria-hidden="true">↗</span>
                </button>
              )}
            </div>
          ))}
        </section>
      )}
      {finding.basis && (
        <section>
          <h4>{finding.basis.kind === "law" ? "Quy định được đối chiếu" : "Tiêu chí đánh giá"}</h4>
          <p className="mb-0 mt-1">{finding.basis.statement}</p>
        </section>
      )}
      {finding.noVerifiedLegalBasis && <p role="note" className={`${styles.notice} m-0`}>Không có căn cứ pháp lý được xác minh cho mục này.</p>}
      {finding.question && (
        <section>
          <h4>{finding.outcome === "referral" ? "Câu hỏi cho chuyên gia" : "Nội dung cần làm rõ"}</h4>
          <p className="mb-0 mt-1 whitespace-pre-wrap">{finding.question}</p>
        </section>
      )}
      <DetailList title="Vấn đề" points={finding.problem} />
      <DetailList title="Ảnh hưởng" points={finding.consequences} />
      <DetailList title="Đề xuất xử lý" points={finding.recommendations} recommendation />
      {!!finding.legalBasis?.length && (
        <section>
          <h4>Căn cứ và tham chiếu</h4>
          <ul>
            {finding.legalBasis.map((item, index) => (
              <li key={index}>
                <span className={`block text-[11px] font-medium ${item.verification === "verified" ? "text-[#346538]" : "text-[#73766f]"}`}>
                  {item.role === "fallback" ? "Quy định khi không có thỏa thuận" : item.role === "reference" ? "Nguồn tham khảo" : "Căn cứ đối chiếu"}
                  {item.verification === "verified" ? " · Đã xác minh" : item.verification === "partially_verified" ? " · Xác minh một phần" : item.verification === "not_in_knowledge_base" ? " · Chưa xác minh trong kho pháp lý" : item.verification === "unreferenced" ? " · Chưa có nguồn đối chiếu" : ""}
                </span>
                {item.text}
              </li>
            ))}
          </ul>
        </section>
      )}
      {!!finding.citations?.length && (
        <section>
          <h4>Nguồn tham chiếu</h4>
          <ul>
            {finding.citations.map((citation, index) => (
              <li key={`${citation.legalKnowledgeChunkId}-${index}`}>
                <strong className="font-medium text-[#292c28]">{citation.citationLabel || citation.sourceTitle}</strong>
                {citation.articleRef && ` · ${citation.articleRef}`}
                {citation.inKnowledgeBase === false && <span data-citation-removed className="text-xs text-[#93988e]"> (văn bản đã gỡ khỏi kho pháp lý)</span>}
                {citation.chunkText && <p className="mb-0 mt-1 whitespace-pre-wrap">{citation.chunkText}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {editing && allowProposalEditing ? (
        <form onSubmit={save} className="grid gap-3">
          <label className="grid gap-1.5 text-xs font-medium text-[#484d45]">Đoạn đề xuất<textarea className={fieldClass} value={revisedText} onChange={(event) => setRevisedText(event.target.value)} rows={5} required /></label>
          <label className="grid gap-1.5 text-xs font-medium text-[#484d45]">Lý do chỉnh sửa<textarea className={fieldClass} value={reason} onChange={(event) => setReason(event.target.value)} rows={2} /></label>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" type="submit" disabled={busy || !revisedText.trim()}>Lưu đề xuất</Button>
            <Button variant="outline" size="sm" type="button" onClick={() => setEditing(false)} disabled={busy}>Hủy</Button>
          </div>
        </form>
      ) : (
        <>
          {finding.proposedRevision?.revisedText && (
            <section className={styles.revision}>
              <h4>Đề xuất chỉnh sửa</h4>
              {finding.proposedRevision.originalText && (
                <div>
                  <p className="m-0 text-[11px] font-medium text-[#73766f]">Nội dung gốc</p>
                  <blockquote className={`${styles.revisionOriginal} whitespace-pre-wrap break-words [overflow-wrap:anywhere]`}>{finding.proposedRevision.originalText}</blockquote>
                </div>
              )}
              <div>
                <p className="m-0 text-[11px] font-medium text-[#346538]">Nội dung đề xuất</p>
                <p className={`${styles.revisionNew} whitespace-pre-wrap break-words [overflow-wrap:anywhere]`}>{finding.proposedRevision.revisedText}</p>
              </div>
              {finding.proposedRevision.reason && <p className="m-0 text-xs text-[#73766f]">{finding.proposedRevision.reason}</p>}
            </section>
          )}
          {allowProposalEditing && contractId && findingId && finding.proposedRevision && (
            <div className="flex flex-wrap gap-3">
              <button type="button" className={styles.textAction} onClick={() => { setRevisedText(finding.proposedRevision?.revisedText ?? ""); setReason(finding.proposedRevision?.reason ?? ""); setEditing(true); }}>Chỉnh sửa đề xuất</button>
              <button type="button" className={`${styles.textAction} disabled:cursor-default disabled:opacity-50`} onClick={discard} disabled={busy}>Bỏ đề xuất</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
