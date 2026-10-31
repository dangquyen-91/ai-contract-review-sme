import type { LegalRetrievalStatus, RuleCheckStatus } from "@/types/contracts";

export function analysisCoverageNotes(version?: {
  riskDetectionStatus?: string;
  legalRetrievalStatus?: LegalRetrievalStatus;
  ruleCheckStatus?: RuleCheckStatus;
}) {
  if (version?.riskDetectionStatus !== "completed") return [];
  const notes: string[] = [];
  if (version.ruleCheckStatus === "skipped") {
    notes.push("Lần phân tích này chưa đối chiếu được các mức giới hạn bắt buộc theo luật (như mức phạt tối đa, lương thử việc). Các rủi ro bên dưới do AI phát hiện.");
  }
  if (version.legalRetrievalStatus === "unavailable" || version.legalRetrievalStatus === "no_sources") {
    notes.push("Lần phân tích này chưa tra cứu được văn bản pháp luật, nên một số rủi ro có thể chưa kèm nguồn tham chiếu.");
  }
  return notes;
}
