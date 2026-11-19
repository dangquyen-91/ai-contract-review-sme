import type { FindingGroup, IssueCounts, IssueGroup, RiskFinding } from "@/types/contracts";

export const issueGroups: IssueGroup[] = ["compliance", "clarity", "completeness", "balance", "drafting"];

type IssueDisplay = {
  label: string;
  badge: string;
  border: string;
  surface: string;
  accent: string;
  marker: string;
  tone: "danger" | "warning" | "info" | "neutral";
};

export const issueDisplay: Record<FindingGroup, IssueDisplay> = {
  compliance: {
    label: "Vi phạm", badge: "border-transparent bg-[#fdebec] text-[#9f2f2d]",
    border: "border-l-[#bd7168]", surface: "border-[#e4e6df] bg-white",
    accent: "text-[#9f2f2d]", marker: "bg-[#b65c52]", tone: "danger",
  },
  clarity: {
    label: "Chưa rõ ràng", badge: "border-transparent bg-[#fbf3db] text-[#856222]",
    border: "border-l-[#c4a567]", surface: "border-[#e4e6df] bg-white",
    accent: "text-[#856222]", marker: "bg-[#b69a5b]", tone: "warning",
  },
  completeness: {
    label: "Thiếu nội dung", badge: "border-transparent bg-[#fbf3db] text-[#856222]",
    border: "border-l-[#c4a567]", surface: "border-[#e4e6df] bg-white",
    accent: "text-[#856222]", marker: "bg-[#b69a5b]", tone: "warning",
  },
  balance: {
    label: "Nên thương lượng", badge: "border-transparent bg-[#edf1f7] text-[#315eac]",
    border: "border-l-[#a6b9d7]", surface: "border-[#e4e6df] bg-white",
    accent: "text-[#315eac]", marker: "bg-[#8097ba]", tone: "info",
  },
  drafting: {
    label: "Lỗi soạn thảo", badge: "border-transparent bg-[#f0f2ec] text-[#62695d]",
    border: "border-l-[#b4bcb0]", surface: "border-[#e4e6df] bg-white",
    accent: "text-[#62695d]", marker: "bg-[#939e8b]", tone: "neutral",
  },
  referral: {
    label: "Đề nghị chuyên gia xem xét", badge: "border-transparent bg-[#edf1f7] text-[#315eac]",
    border: "border-l-[#a6b9d7]", surface: "border-[#e4e6df] bg-white",
    accent: "text-[#315eac]", marker: "bg-[#8097ba]", tone: "info",
  },
};

export const issueCountKeys: Record<IssueGroup, keyof IssueCounts> = {
  compliance: "violations", clarity: "unclear", completeness: "missing", balance: "negotiable", drafting: "drafting",
};

const unverifiedDisplay: IssueDisplay = {
  label: "Chưa xác minh được", badge: "border-dashed border-[#d8c698] bg-[#faf6eb] text-[#856222]",
  border: "border-l-[#c4a567]", surface: "border-[#e4e6df] bg-white",
  accent: "text-[#856222]", marker: "bg-[#b69a5b]", tone: "warning",
};
const legacyDisplay: IssueDisplay = {
  label: "Kết quả trước đây", badge: "border-transparent bg-[#f0f2ec] text-[#73766f]",
  border: "border-l-[#b4bcb0]", surface: "border-[#e4e6df] bg-white",
  accent: "text-[#73766f]", marker: "bg-[#b4bcb0]", tone: "neutral",
};

export function findingDisplay(finding: Pick<RiskFinding, "checkGroup" | "outcome">) {
  if (finding.outcome === "unverified") return unverifiedDisplay;
  if (finding.outcome === "referral" || finding.checkGroup === "referral") return issueDisplay.referral;
  if (finding.outcome === "failed" && issueDisplay[finding.checkGroup]) return issueDisplay[finding.checkGroup];
  return legacyDisplay;
}

export const issueFilterOptions = [
  { value: "violations", label: "Có vi phạm" },
  { value: "any", label: "Có vấn đề" },
  { value: "none", label: "Không phát hiện vấn đề" },
] as const;

export const issueBucketLabels = {
  withViolations: "Có vi phạm",
  withIssues: "Có vấn đề khác",
  noIssues: "Không phát hiện vấn đề",
};
