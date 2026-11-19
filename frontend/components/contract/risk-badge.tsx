import { Badge } from "@/components/ui/badge";
import { contractIssueSummary, issueCountSummary } from "@/lib/review/issue-counts";
import type { DashboardContract, IssueCounts } from "@/types/contracts";

export function RiskBadge(props: { contract: DashboardContract } | { counts?: IssueCounts | null }) {
  const summary = "contract" in props ? contractIssueSummary(props.contract) : issueCountSummary(props.counts);
  const color = summary.tone === "danger" ? "bg-[#fdebec] text-[#9f2f2d]"
    : summary.tone === "warning" ? "bg-[#fbf3db] text-[#856222]"
    : summary.tone === "info" ? "bg-[#edf1f7] text-[#315eac]"
    : "bg-[#f0f2ec] text-[#62695d]";
  return (
    <Badge variant={summary.tone} className={`max-w-full items-start gap-1.5 whitespace-normal rounded-md border-transparent px-2 py-0.5 text-left text-[11px] font-medium leading-5 ${color}`}>
      <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-current opacity-70" />
      {summary.label}
    </Badge>
  );
}
