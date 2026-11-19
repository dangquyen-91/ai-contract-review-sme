import { issueCountKeys, issueDisplay, issueGroups } from "@/config/issue-display";
import type { IssueCounts } from "@/types/contracts";
import styles from "@/styles/review/review-design.module.css";

export function IssueSummary({ counts, onOpen }: { counts?: IssueCounts | null; onOpen?: () => void }) {
  if (!counts) {
    return (
      <p role="note" className={`${styles.scope} m-0 rounded-lg border border-dashed border-border bg-muted p-4 text-ui-meta leading-6 text-muted-foreground`}>
        Chưa có kết quả theo tiêu chí mới. Hãy rà soát lại để xem phân loại vấn đề và phạm vi kiểm tra.
      </p>
    );
  }

  return (
    <div className={`${styles.scope} ${styles.issueSummary}`}>
      <div className={styles.issueOverview}>
        <div className={styles.issueLead}>
          <span data-has-violations={counts.violations > 0} className={`${styles.issueTotal} ${counts.violations > 0 ? "text-[#9f2f2d]" : "text-[#292c28]"}`}>{counts.total}</span>
          <span className={styles.issueLeadLabel}>vấn đề<br className="hidden md:block" /> đã xác định</span>
        </div>
        <dl aria-label="Tổng quan vấn đề" className={styles.issueMetrics}>
          {issueGroups.map((group) => {
            const display = issueDisplay[group];
            const count = counts[issueCountKeys[group]];
            const content = (
              <>
                <span className={styles.issueMetricLabel}>
                  <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${count > 0 ? display.marker : "bg-[#d5d9cf]"}`} />
                  {display.label}
                </span>
                <span className={`${styles.issueMetricValue} ${count > 0 ? display.accent : "text-[#a5aa9e]"}`}>{count}</span>
              </>
            );
            return (
              <div key={group} data-tone={display.tone} data-active={count > 0} className={styles.issueMetric}>
                <dt className="sr-only">{display.label}</dt>
                <dd>
                  {onOpen ? (
                    <button type="button" onClick={onOpen} className={styles.issueMetricContent}>{content}</button>
                  ) : <div className={styles.issueMetricContent}>{content}</div>}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
      {(counts.unverified > 0 || counts.referrals > 0) && (
        <div className={styles.issueNotes}>
          {counts.unverified > 0 && <span className="text-[#856222]"><strong className="font-semibold tabular-nums">{counts.unverified}</strong> điểm chưa xác minh</span>}
          {counts.referrals > 0 && <span><strong className="font-semibold tabular-nums text-[#315eac]">{counts.referrals}</strong> điểm cần chuyên gia</span>}
          <span>Không tính vào {counts.total} vấn đề đã xác định.</span>
        </div>
      )}
    </div>
  );
}
