"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { findingDisplay } from "@/config/issue-display";
import { findingVerdictLabels } from "@/lib/review/verification-workspace";
import { verificationClauseLabel } from "@/lib/review/verification-display";
import type { VerifiedFinding } from "@/types/verification-workspace";
import { FindingProposedRevision } from "./finding-proposed-revision";
import styles from "@/styles/review/review-design.module.css";

export function VerificationFindingCard({ finding, editable, readOnly = false, savedAt, selected = false, onSelect, onConfirm, onEdit, onReject, onRemove, onLocate }: {
  finding: VerifiedFinding;
  editable: boolean;
  readOnly?: boolean;
  savedAt?: string;
  selected?: boolean;
  onSelect: () => void;
  onConfirm: () => void;
  onEdit: () => void;
  onReject: () => void;
  onRemove: () => void;
  onLocate: () => void;
}) {
  const display = findingDisplay(finding);
  const expertAdded = finding.detectedBy === "expert";
  const rejected = finding.verification?.verdict === "rejected";
  const verdictColor = finding.verification?.verdict === "confirmed" ? "text-[#346538]" : "text-[#73766f]";
  const sections = [
    { label: "Hậu quả", points: finding.consequences },
    { label: "Khuyến nghị", points: finding.recommendations },
    { label: "Căn cứ tham chiếu", points: finding.legalBasis?.map((basis) => basis.text) ?? [] },
  ];

  return (
    <article data-finding-id={finding.id ?? finding._id} data-finding-group={finding.checkGroup} data-finding-outcome={finding.outcome} data-selected={selected} data-rejected={rejected} tabIndex={-1} className={`${styles.scope} ${styles.expertFinding}`}>
      <div className={styles.findingHeader}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          <span className={`${styles.findingTag} ${rejected ? "bg-[#f0f2ec] text-[#73766f]" : display.badge}`}>{display.label}</span>
          <span className={`inline-flex items-center gap-1.5 text-[11px] ${verdictColor}`}>
            <span aria-hidden="true" className="size-1 rounded-full bg-current opacity-60" />
            {finding.verification ? findingVerdictLabels[finding.verification.verdict] : "Chưa xử lý"}
          </span>
          {savedAt && <span className="text-[11px] text-[#346538]">Đã lưu</span>}
          {selected && <span className="ml-auto text-[11px] font-medium text-[#315eac]">Đang đối chiếu</span>}
        </div>
        <h3 className={styles.findingTitle}>
          <button type="button" aria-pressed={selected} aria-controls="verification-document" onClick={onSelect} className="w-full cursor-pointer rounded-sm text-left hover:text-[#315eac] [overflow-wrap:anywhere]">
            {finding.title}
          </button>
        </h3>
      </div>
      <p className={`${styles.findingPreview} line-clamp-3`}>{finding.problem[0] || "Chưa có mô tả vấn đề."}</p>
      {finding.problem.length > 0 && (
        <details className="mt-2 text-ui-meta leading-7">
          <summary className={`${styles.textAction} list-item w-fit`}>Đọc đầy đủ vấn đề{finding.problem.length > 1 ? ` (${finding.problem.length} ý)` : ""}</summary>
          <ul className="mb-0 mt-2 space-y-2 pl-4 text-[#484d45]">
            {finding.problem.map((point, index) => <li key={index} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{point}</li>)}
          </ul>
        </details>
      )}
      {finding.clause && (
        <button type="button" className={`${styles.textAction} mt-2`} onClick={onLocate}>
          {verificationClauseLabel(finding.clause)} <span aria-hidden="true">↗</span> Xem vị trí
        </button>
      )}
      <details className={styles.expertDisclosure}>
        <summary className="w-fit cursor-pointer text-xs font-medium text-[#484d45]">Phân tích và căn cứ</summary>
        <div className={styles.details}>
          {!!finding.evidence?.length && (
            <section>
              <h4>Bằng chứng trong hợp đồng</h4>
              {finding.evidence.map((item, index) => (
                <blockquote key={index} className={styles.detailQuote}>
                  {item.label && <strong className="block text-[11px] font-medium text-[#73766f]">{item.label}</strong>}
                  {item.quote}
                </blockquote>
              ))}
            </section>
          )}
          {finding.basis && <section><h4>{finding.basis.kind === "law" ? "Quy định đối chiếu" : "Tiêu chí đánh giá"}</h4><p className="mb-0 mt-1">{finding.basis.statement}</p></section>}
          {finding.reason && <p className={styles.notice}>{finding.reason}</p>}
          {finding.question && <p className="m-0">{finding.question}</p>}
          {finding.noVerifiedLegalBasis && <p className={styles.notice}>Không có căn cứ pháp lý được xác minh.</p>}
          {sections.map(({ label, points }) => (
            <section key={label} className={label === "Khuyến nghị" ? styles.recommendation : undefined}>
              <h4>{label}</h4>
              {points.length ? <ul>{points.map((point, index) => <li key={index} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{point}</li>)}</ul> : <p className="mb-0 mt-1 text-[#93988e]">Chưa có nội dung.</p>}
            </section>
          ))}
          {finding.citations?.map((citation, index) => (
            <details key={index} className="border-t border-[#e4e6df] pt-3">
              <summary className="cursor-pointer text-xs text-[#315eac]">{citation.citationLabel} {citation.articleRef}</summary>
              <p className="mb-0 mt-2 whitespace-pre-wrap break-words">{citation.chunkText}</p>
            </details>
          ))}
        </div>
      </details>
      <FindingProposedRevision revision={finding.proposedRevision} />
      {finding.verification?.reason && (
        <details className={styles.expertDisclosure}>
          <summary className="w-fit cursor-pointer text-xs text-[#73766f]">Lý do xử lý</summary>
          <p className="mb-0 mt-2 whitespace-pre-wrap break-words">{finding.verification.reason}</p>
        </details>
      )}
      {!readOnly && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#e4e6df] pt-4">
          {!expertAdded && (
            <Button size="sm" variant="secondary" className="rounded-md bg-[#edf3ec] text-xs text-[#355738] shadow-none hover:bg-[#e2ebdf] hover:text-[#355738]" disabled={!editable || finding.verification?.verdict === "confirmed"} onClick={onConfirm}>
              <Icon name="check" />Xác nhận
            </Button>
          )}
          <Button size="sm" variant="outline" className="rounded-md border-[#d8ddd1] text-xs text-[#484d45] shadow-none hover:bg-[#f0f2ec] hover:text-[#292c28]" disabled={!editable} onClick={onEdit}>Điều chỉnh</Button>
          {expertAdded ? (
            <Button size="sm" variant="ghost" className="ml-auto text-xs text-[#9f2f2d] hover:bg-[#fdebec] hover:text-[#9f2f2d]" disabled={!editable} onClick={onRemove}>Xóa vấn đề bổ sung</Button>
          ) : (
            <Button size="sm" variant="ghost" className="ml-auto text-xs text-[#73766f] hover:bg-[#fdebec] hover:text-[#9f2f2d]" disabled={!editable || rejected} onClick={onReject}>Bác bỏ</Button>
          )}
        </div>
      )}
    </article>
  );
}
