import type { ContractReviewRun } from "@/types/contracts";

const playbookStages: Record<string, string> = {
  collecting_evidence: "Đang thu thập và kiểm chứng bằng chứng…",
  evaluating_checks: "Đang đánh giá các tiêu chí rà soát…",
  preparing_suggestions: "Đang chuẩn bị đề xuất và câu hỏi cho chuyên gia…",
  saving_findings: "Đang lưu kết quả rà soát…",
};

export function playbookProgressLabel(detail?: string) {
  return detail ? playbookStages[detail] : undefined;
}

export function reviewProgressLabel(review: ContractReviewRun): string {
  if (review.status === "queued") return "Đang xếp hàng rà soát…";
  if (review.status === "failed") return review.error || "Rà soát thất bại.";
  if (review.status === "cancelled") return "Đã dừng rà soát.";
  if (review.status === "completed") return "Đang tải kết quả rà soát…";
  if (review.stageDetail === "Đang thử lại sau lỗi") return "Hệ thống đang thử lại bước xử lý gặp lỗi…";
  const detail = playbookProgressLabel(review.stageDetail);
  if (detail) return detail;
  if (review.stages?.summary === "running" && review.stages.riskDetection === "running") return "Đang tóm tắt và đánh giá rủi ro song song…";
  switch (review.currentStage) {
    case "waiting_for_extraction":
      return `Đang đọc tài liệu${review.stageDetail ? ` (${review.stageDetail})` : ""}…`;
    case "segmentation": return "Đang phân tách điều khoản…";
    case "summary": return "Đang tóm tắt hợp đồng…";
    case "risk_detection": return "Đang phát hiện rủi ro…";
    default: return "AI đang rà soát hợp đồng…";
  }
}
