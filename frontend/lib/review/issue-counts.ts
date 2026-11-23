import { issueCountKeys, issueGroups } from "@/config/issue-display";
import type { ContractReviewResult, DashboardContract, IssueCounts, RiskFinding } from "@/types/contracts";

export function countFindingIssues(findings: Pick<RiskFinding, "checkGroup" | "outcome" | "verification">[]): IssueCounts {
  const counts: IssueCounts = { violations: 0, unclear: 0, missing: 0, negotiable: 0, drafting: 0, unverified: 0, referrals: 0, total: 0 };
  for (const finding of findings) {
    if (finding.verification?.verdict === "rejected") continue;
    if (finding.outcome === "unverified") counts.unverified++;
    else if (finding.outcome === "referral") counts.referrals++;
    else if (finding.outcome === "failed" && issueGroups.includes(finding.checkGroup as (typeof issueGroups)[number])) {
      counts[issueCountKeys[finding.checkGroup as (typeof issueGroups)[number]]]++;
      counts.total++;
    }
  }
  return counts;
}

export function contractIssueCounts(contract: DashboardContract) {
  return contract.currentVersion ? contract.currentVersion.issueCounts : contract.issueCounts;
}

export function reviewIssueCounts(result: ContractReviewResult) {
  const stored = result.contract.currentVersion?.issueCounts;
  if (!stored) return undefined;
  if (!result.findings.length) return stored;
  return countFindingIssues(result.findings);
}

export function contractIssueSummary(contract: DashboardContract): { label: string; tone: "neutral" | "warning" | "danger" | "info" } {
  const counts = contractIssueCounts(contract);
  if (contract.currentVersion?.riskDetectionStatus && contract.currentVersion.riskDetectionStatus !== "completed") {
    return { label: "Rà soát chưa hoàn tất", tone: "neutral" };
  }
  return issueCountSummary(counts);
}

export function issueCountSummary(counts?: IssueCounts | null): { label: string; tone: "neutral" | "warning" | "danger" | "info" } {
  if (!counts) return { label: "Chưa có kết quả theo tiêu chí mới", tone: "neutral" };
  if (counts.violations > 0) return { label: `${counts.violations} vi phạm · ${counts.total} vấn đề`, tone: "danger" };
  if (counts.total > 0) return { label: `${counts.total} vấn đề cần xử lý`, tone: "warning" };
  if (counts.unverified > 0 || counts.referrals > 0) return { label: "Cần xem xét thêm", tone: "info" };
  return { label: "Không phát hiện vấn đề theo tiêu chí đã kiểm tra", tone: "neutral" };
}

export function compareFindings(a: RiskFinding, b: RiskFinding) {
  const indexOf = (finding: RiskFinding) => finding.clause?.index ?? finding.evidence?.find((item) => item.clauseIndex != null)?.clauseIndex ?? Number.MAX_SAFE_INTEGER;
  const rankOf = (finding: RiskFinding) => {
    const rank = [...issueGroups, "referral"].indexOf(finding.checkGroup);
    return rank < 0 ? 9 : rank;
  };
  return indexOf(a) - indexOf(b) || rankOf(a) - rankOf(b);
}
