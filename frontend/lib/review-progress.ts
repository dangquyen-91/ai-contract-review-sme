import type { ContractReviewRun } from "@/types/contracts";

export function reviewProgressLabel(review: ContractReviewRun): string {
  if (review.status === "queued") return "Đang xếp hàng rà soát…";
  if (review.status === "failed") return review.error || "Rà soát thất bại.";
  if (review.status === "completed") return "Đang tải kết quả rà soát…";
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
