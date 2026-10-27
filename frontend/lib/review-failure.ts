import { isApiClientError } from "@/lib/api/client";

export type ReviewBlockReason = "quota" | "plan" | "permission";

export function reviewBlockReason(error: unknown): ReviewBlockReason | null {
  if (!isApiClientError(error) || error.status !== 403) return null;
  if (error.serverCode === 'ANALYSIS_QUOTA_EXHAUSTED' || /analysis quota exhausted|không đủ lượt rà soát/i.test(error.message)) return "quota";
  if (error.serverCode === 'AI_PLAN_REQUIRED' || /active Business plan is required|cần gói dịch vụ AI đang hoạt động/i.test(error.message)) return "plan";
  return "permission";
}

export function reviewBlockedMessage(reason: ReviewBlockReason) {
  if (reason === "quota") return "Hợp đồng đã lưu. Bạn không đủ lượt rà soát AI cho số trang của tài liệu; yêu cầu mới chưa được bắt đầu.";
  if (reason === "plan") return "Hợp đồng đã lưu. Chưa có gói AI đang hoạt động để bắt đầu rà soát.";
  return "Hợp đồng đã lưu. Tài khoản chưa được phép thực hiện yêu cầu rà soát này.";
}
