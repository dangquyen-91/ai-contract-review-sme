"use client";

import type { ReactNode } from "react";
import { findingDisplay } from "@/config/issue-display";
import type { RiskFinding } from "@/types/contracts";
import { FindingVerificationBadge, FindingVerificationInfo } from "@/components/expert-verification/finding-verification-info";
import styles from "@/styles/review/review-design.module.css";
import { clauseLabel } from "@/lib/review/clause-label";

export function RiskFindingCard({ finding, clauseIndex: anchoredClauseIndex, clauseLabel: anchoredClauseLabel, expanded, detailId, onToggle, onJump, jumpLabel, children }: {
  finding: RiskFinding;
  clauseIndex?: number | null;
  clauseLabel?: string;
  expanded: boolean;
  detailId: string;
  onToggle: () => void;
  onJump?: () => void;
  jumpLabel: string;
  children: ReactNode;
}) {
  const display = findingDisplay(finding);
  const rejected = finding.verification?.verdict === "rejected";
  const referral = finding.outcome === "referral" || finding.findingType === "referral";
  const unverifiedReason = finding.outcome === "unverified"
    ? finding.reason || "Chưa xác minh đủ căn cứ hoặc điều kiện áp dụng để kết luận."
    : undefined;
  const preview = finding.problem?.find((point) => point.trim() && point.trim() !== unverifiedReason?.trim());
  const clauseIndex = anchoredClauseIndex !== undefined ? anchoredClauseIndex
    : finding.clause?.index ?? finding.evidence?.find((item) => item.clauseIndex != null)?.clauseIndex;
  const reference = clauseIndex == null ? undefined : anchoredClauseLabel ?? clauseLabel({
    index: clauseIndex, title: finding.clause?.index === clauseIndex ? finding.clause.title : undefined,
  });

  return (
    <li data-finding-group={finding.checkGroup} data-finding-outcome={finding.outcome} data-rejected={rejected} data-expanded={expanded} className={`${styles.scope} ${styles.finding}`}>
      <div className={styles.findingHeader}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${styles.findingTag} ${rejected ? "bg-[#f0f2ec] text-[#73766f]" : display.badge}`}>
            {display.label}
          </span>
          <FindingVerificationBadge verification={finding.verification} />
          {reference && <span className={styles.findingIndex}>{reference}</span>}
        </div>
        <h4 className={styles.findingTitle}>{finding.title}</h4>
      </div>
      <FindingVerificationInfo verification={finding.verification} checkGroup={finding.checkGroup} />
      {finding.findingType === "missing_clause" && <p className={styles.findingPreview}>Điều khoản này chưa có trong hợp đồng.</p>}
      {referral && <p className={styles.findingPreview}>Câu hỏi cần chuyên gia xem xét thêm, chưa phải kết luận vi phạm.</p>}
      {unverifiedReason && <p className="mb-0 mt-2 text-ui-meta leading-6 text-[#856222]">{unverifiedReason}</p>}
      {!expanded && preview && preview !== finding.title && <p className={`${styles.findingPreview} line-clamp-3 whitespace-pre-wrap`}>{preview}</p>}
      <div className={styles.findingActions}>
        <button type="button" className={styles.findingExpand} aria-expanded={expanded} aria-controls={expanded ? detailId : undefined} onClick={onToggle}>
          {expanded ? "Thu gọn" : referral ? "Xem câu hỏi và nguồn tham khảo" : "Bằng chứng và đề xuất"}
          <svg aria-hidden="true" viewBox="0 0 12 12" className={`size-3 shrink-0 transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m3 4.5 3 3 3-3" /></svg>
        </button>
        {onJump && <button type="button" className={styles.textAction} onClick={onJump} aria-label={jumpLabel}>Xem vị trí <span aria-hidden="true">↗</span></button>}
      </div>
      {expanded && <div id={detailId}>{children}</div>}
    </li>
  );
}
