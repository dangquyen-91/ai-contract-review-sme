import type { RiskFinding } from "@/types/contracts";
import type { VerificationFindingInput } from "@/types/verification-workspace";

export function activeRiskFindings<T extends Pick<RiskFinding, "verification">>(findings: T[]) {
  return findings.filter((finding) => finding.verification?.verdict !== "rejected");
}

export const verificationSnapshotFields = [
  { key: "title", label: "Tiêu đề" },
  { key: "severity", label: "Mức rủi ro" },
  { key: "riskCode", label: "Loại rủi ro" },
  { key: "problem", label: "Vấn đề" },
  { key: "consequences", label: "Hậu quả" },
  { key: "recommendations", label: "Khuyến nghị" },
] as const;

export function verificationSnapshotChanges(before?: Partial<VerificationFindingInput> | null, after?: Partial<VerificationFindingInput> | null) {
  return verificationSnapshotFields.filter(({ key }) => JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]));
}
