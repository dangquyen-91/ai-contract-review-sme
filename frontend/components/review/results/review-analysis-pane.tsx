"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RiskDetails } from "@/components/review/results/risk-details";
import { RiskFindingCard } from "@/components/review/results/risk-finding-card";
import { ExecutiveSummary } from "@/components/review/results/executive-summary";
import { ReviewCoverage } from "@/components/review/results/review-coverage";
import { issueDisplay, issueGroups } from "@/config/issue-display";
import workspaceStyles from "@/styles/review/review-workspace.module.css";
import styles from "@/styles/review/review-design.module.css";
import type { ContractQuote, ContractReviewResult, IssueGroup, RiskFinding } from "@/types/contracts";
import { activeRiskFindings } from "@/lib/review/verification-findings";
import { clauseLabel } from "@/lib/review/clause-label";

type FindingFilter = "all" | IssueGroup | "unverified" | "referral";
const filterLabels = { unverified: "Chưa xác minh", referral: "Cần chuyên gia" };

function findingClauseIndex(finding: RiskFinding, clauses: ContractReviewResult["clauses"]): number | null {
  if (finding.findingType === "missing_clause") return null;
  return clauses.find((clause) => (clause.id ?? clause._id) === finding.clauseId)?.index
    ?? finding.clause?.index ?? finding.evidence?.find((item) => item.clauseIndex != null)?.clauseIndex ?? null;
}

function matches(finding: RiskFinding, filter: FindingFilter) {
  if (filter === "all") return true;
  if (filter === "unverified" || filter === "referral") return finding.outcome === filter;
  return finding.outcome === "failed" && finding.checkGroup === filter;
}

export function ReviewAnalysisPane({ result, sectionId, isDocx, showSummary = true, onJumpToClause, onJumpToSource }: {
  result: ContractReviewResult;
  sectionId: string;
  isDocx: boolean;
  showSummary?: boolean;
  onJumpToClause: (index: number) => void;
  onJumpToSource?: (source: ContractQuote) => void;
}) {
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<FindingFilter>("all");
  const [selectedVerificationFilter, setVerificationFilter] = useState<"active" | "rejected">("active");
  const clauses = result.clauses;
  const version = result.contract.currentVersion;
  const contractId = result.contract.id ?? result.contract._id;
  const risksComplete = version?.riskDetectionStatus === "completed";
  const activeFindings = activeRiskFindings(result.findings);
  const rejectedFindings = result.findings.filter((finding) => finding.verification?.verdict === "rejected");
  const verificationFilter = rejectedFindings.length ? selectedVerificationFilter : "active";
  const findings = verificationFilter === "rejected" ? rejectedFindings : activeFindings;
  const rank = (group: string) => {
    const index = [...issueGroups, "referral"].indexOf(group);
    return index < 0 ? 9 : index;
  };
  const visibleFindings = findings.filter((finding) => matches(finding, groupFilter)).sort((a, b) =>
    (findingClauseIndex(a, clauses) ?? Number.MAX_SAFE_INTEGER) - (findingClauseIndex(b, clauses) ?? Number.MAX_SAFE_INTEGER)
    || rank(a.checkGroup) - rank(b.checkGroup));
  const filters: FindingFilter[] = ["all", ...issueGroups, "unverified", "referral"];
  const headingId = `${sectionId}-findings-heading`;

  return (
    <div id={`${sectionId}-analysis`} className={`${styles.scope} min-w-0 border-r border-[#e4e6df] max-[1080px]:border-r-0 max-[1080px]:border-b ${workspaceStyles.analysisPane}`}>
      {showSummary && <div className={`${styles.analysisSection} border-b border-[#e4e6df] bg-[#fbfcfa]`}>
        <ExecutiveSummary points={version?.summaryPoints} assessment={version?.overallAssessment} complete={version?.summaryStatus === "completed"} />
      </div>}
      <section className={`${styles.analysisSection} space-y-4 bg-white`} aria-labelledby={headingId}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id={headingId} className={styles.sectionHeading}>{verificationFilter === "rejected" ? "Các mục đã bác bỏ" : "Kết quả kiểm tra"}</h3>
          <span className="text-ui-meta tabular-nums text-muted-foreground">{visibleFindings.length}/{findings.length} mục{findings.length > 1 ? " · theo điều khoản" : ""}</span>
        </div>
        <ReviewCoverage coverage={version?.checkCoverage} />
        {!version?.issueCounts && <p role="note" className="m-0 text-ui-meta leading-6 text-muted-foreground">{risksComplete ? "Kết quả trước đây chưa có phân loại theo tiêu chí mới. Hãy rà soát lại để cập nhật." : "Rà soát chưa hoàn tất, chưa có số liệu phân loại vấn đề."}</p>}
        {rejectedFindings.length > 0 && <div className="space-y-2">
          <div role="group" aria-label="Lọc theo kết quả chuyên gia" className="flex flex-wrap gap-2">
            {([{ value: "active", label: `Đang áp dụng (${activeFindings.length})` }, { value: "rejected", label: `Đã bác bỏ (${rejectedFindings.length})` }] as const).map((filter) =>
              <Button key={filter.value} variant={verificationFilter === filter.value ? "secondary" : "outline"} size="sm" aria-pressed={verificationFilter === filter.value} onClick={() => { setVerificationFilter(filter.value); setGroupFilter("all"); setExpandedFinding(null); }}>{filter.label}</Button>)}
          </div>
          <p className="m-0 text-ui-meta leading-5 text-muted-foreground">Các mục bị bác bỏ được giữ để đối chiếu, không tính vào số vấn đề đang áp dụng.</p>
        </div>}
        <div role="group" className={styles.filterBar} aria-label="Lọc nhóm vấn đề">
          {filters.map((filter) => {
            const count = findings.filter((finding) => matches(finding, filter)).length;
            const label = filter === "all" ? "Tất cả" : filter === "unverified" || filter === "referral" ? filterLabels[filter] : issueDisplay[filter].label;
            return (
              <button key={filter} type="button" className={styles.filterButton} aria-pressed={groupFilter === filter}
                disabled={filter !== "all" && count === 0 && groupFilter !== filter} onClick={() => { setGroupFilter(filter); setExpandedFinding(null); }}>
                {label} <span className={styles.filterCount}>{count}</span>
              </button>
            );
          })}
        </div>
        {visibleFindings.length ? <ul className={styles.findingsList}>{visibleFindings.map((finding) => {
          const clauseIndex = findingClauseIndex(finding, clauses);
          const canJump = clauseIndex !== null && clauses.some((clause) => clause.index === clauseIndex);
          const findingKey = finding.id ?? finding._id ?? `${finding.title}-${findings.indexOf(finding)}`;
          const expanded = expandedFinding === findingKey;
          const source = finding.evidence?.find((item) => item.quote && item.clauseIndex === clauseIndex);
          const clause = clauses.find((item) => item.index === clauseIndex);
          const reference = clause ? clauseLabel(clause.label ? clause : {
            ...clause, title: finding.clause?.index === clause.index ? finding.clause.title : undefined,
          }) : undefined;
          return <RiskFindingCard key={findingKey} finding={finding} clauseIndex={clauseIndex} clauseLabel={reference} expanded={expanded} detailId={`${sectionId}-finding-${findings.indexOf(finding)}`}
            onToggle={() => setExpandedFinding(expanded ? null : findingKey)}
            onJump={canJump ? () => source?.quote && source.clauseIndex != null && onJumpToSource ? onJumpToSource({ ...source, quote: source.quote, clauseIndex: source.clauseIndex }) : onJumpToClause(clauseIndex) : undefined}
            jumpLabel={`${finding.title}. ${isDocx ? "Xem vị trí trong file gốc" : "Xem vị trí trong văn bản đầy đủ"}`}>
            <RiskDetails contractId={contractId} finding={finding} clauses={clauses} onSource={onJumpToSource}
              allowProposalEditing={isDocx && canJump && finding.verification?.verdict !== "rejected" && finding.outcome !== "referral"} />
          </RiskFindingCard>;
        })}</ul> : <p className="m-0 rounded-lg bg-muted/30 p-4 text-ui leading-6 text-muted-foreground">
          {groupFilter !== "all" ? "Không có mục nào trong nhóm đang chọn." : verificationFilter === "rejected" ? "Chưa có mục bị chuyên gia bác bỏ."
            : !risksComplete ? "Rà soát chưa hoàn tất." : !version?.issueCounts ? "Chưa có kết quả theo tiêu chí mới."
            : !result.findings.length && version.issueCounts.total + version.issueCounts.unverified + version.issueCounts.referrals > 0 ? "Chưa có chi tiết cho các mục đã ghi nhận. Hãy tải lại kết quả để đối chiếu."
            : "Không phát hiện vấn đề theo các tiêu chí đã kiểm tra. Xem phạm vi rà soát để biết các nội dung chưa kiểm tra được."}
        </p>}
      </section>
    </div>
  );
}
