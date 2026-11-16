import type { ExpertVerification } from "@/types/expert-verification";
import type { VerificationFindingInput, VerifiedFinding } from "@/types/verification-workspace";

export function canEditVerification(verification: ExpertVerification, expertId: string) {
  const assigned = typeof verification.expertId === "object" ? verification.expertId?._id : verification.expertId;
  return verification.status === "in_progress" && assigned === expertId;
}

export function changedFindingFields(finding: VerifiedFinding, input: VerificationFindingInput) {
  const changes: Partial<VerificationFindingInput> = {};
  for (const key of ["severity", "riskCode", "title", "problem", "consequences", "recommendations"] as const) {
    const previous = key === "riskCode" ? finding[key] ?? "OTHER" : finding[key];
    if (JSON.stringify(previous) !== JSON.stringify(input[key])) Object.assign(changes, { [key]: input[key] });
  }
  return changes;
}

export const findingVerdictLabels = { confirmed: "Đã xác nhận", adjusted: "Đã điều chỉnh", rejected: "Đã bác bỏ", added: "Chuyên gia bổ sung" };
