import { isApiClientError } from "@/lib/api/client";

export type ReviewBlockReason = "quota" | "plan" | "permission";

export function reviewBlockReason(error: unknown): ReviewBlockReason | null {
  if (!isApiClientError(error) || error.status !== 403) return null;
  if (/analysis quota exhausted/i.test(error.message)) return "quota";
  if (/active Business plan is required/i.test(error.message)) return "plan";
  return "permission";
}

export function reviewBlockedMessage(reason: ReviewBlockReason) {
  if (reason === "quota") return "Hợp đồng đã lưu. Bạn đã hết lượt rà soát AI; yêu cầu phân tích mới chưa được bắt đầu.";
  if (reason === "plan") return "Hợp đồng đã lưu. Chưa có gói AI đang hoạt động để bắt đầu rà soát.";
  return "Hợp đồng đã lưu. Tài khoản chưa được phép thực hiện yêu cầu rà soát này.";
}
