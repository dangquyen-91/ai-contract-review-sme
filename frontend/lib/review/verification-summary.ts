import type { VerifiedFinding } from "@/types/verification-workspace";
import { countFindingIssues } from "./issue-counts";

export const findingId = (finding: VerifiedFinding) => (finding.id ?? finding._id)!;

export function verificationSummary(findings: VerifiedFinding[]) {
  const totals = { confirmed: 0, adjusted: 0, rejected: 0, added: 0, pending: 0 };
  for (const finding of findings) {
    const verdict = finding.verification?.verdict;
    if (verdict) totals[verdict]++; else totals.pending++;
  }
  return { ...totals, issues: countFindingIssues(findings) };
}

export function nextPendingFinding(findings: VerifiedFinding[], after?: string | null) {
  const start = after ? findings.findIndex((item) => findingId(item) === after) : -1;
  for (let offset = 1; offset <= findings.length; offset++) {
    const item = findings[(start + offset) % findings.length];
    if (!item.verification) return item;
  }
  return undefined;
}
