import type { ClassificationOutcome, ReviewErrorCode } from "@/types/contracts";

export type ReviewFailureAction = "retry" | "reupload" | "none";

export const reviewErrorCopy: Record<ReviewErrorCode, { message: string; action: ReviewFailureAction }> = {
  AI_OVERLOADED: { message: "Dịch vụ AI đang quá tải hoặc trả kết quả lỗi. Bạn chưa bị trừ lượt.", action: "retry" },
  EXTRACTION_TIMEOUT: { message: "Đọc tệp hợp đồng mất quá nhiều thời gian. Bạn chưa bị trừ lượt.", action: "retry" },
  EXTRACTION_FAILED: { message: "Không đọc được nội dung tệp. Hãy tải lên tệp rõ hơn hoặc ở định dạng khác.", action: "reupload" },
  CONTRACT_DELETED: { message: "Hợp đồng đã bị xóa nên không thể tiếp tục rà soát.", action: "none" },
  CREDIT_EXPIRED: { message: "Phiên giữ lượt rà soát đã hết hạn. Bạn chưa bị trừ lượt.", action: "retry" },
  CANCELLED: { message: "Bạn đã dừng rà soát. Lượt rà soát đã được hoàn lại.", action: "retry" },
  UNKNOWN: { message: "Đã xảy ra lỗi khi rà soát. Bạn chưa bị trừ lượt.", action: "retry" },
};

export function reviewFailureCopy(code?: ReviewErrorCode) {
  return reviewErrorCopy[code ?? "UNKNOWN"] ?? reviewErrorCopy.UNKNOWN;
}

export const classificationOutcomeCopy: Record<Exclude<ClassificationOutcome, "supported">, { title: string; message: string }> = {
  unsupported_type: {
    title: "Chưa hỗ trợ loại hợp đồng này",
    message: "LawScan chưa rà soát được loại hợp đồng này. Bạn chưa bị trừ lượt nào.",
  },
  not_contract: {
    title: "Tệp này có vẻ không phải hợp đồng",
    message: "Hãy kiểm tra lại tệp đã chọn. Bạn chưa bị trừ lượt nào.",
  },
  not_allowed_for_account: {
    title: "Loại hợp đồng này dành cho loại tài khoản khác",
    message: "Tài khoản hiện tại chưa được rà soát loại hợp đồng này. Bạn chưa bị trừ lượt nào.",
  },
};

const serverCodeMessages: Record<string, string> = {
  PAID_REVIEW_COMPLETED: "Phiên bản hợp đồng này đã được rà soát. Hãy mở kết quả đã lưu; bạn không cần thanh toán lại.",
  CONTRACT_NOT_CONFIRMED: "Hãy xác nhận loại hợp đồng trước khi rà soát.",
  REVIEW_RUNNING: "Hợp đồng đang được rà soát ở một phiên khác.",
  REVIEW_FINISHED: "Lượt rà soát đã kết thúc.",
  REVIEW_NOT_RETRYABLE: "Lượt rà soát này không thể chạy lại.",
  REVIEW_OUTDATED: "Hợp đồng đã có phiên bản mới. Hãy bắt đầu lượt rà soát mới.",
  REVIEW_BUSY: "Lượt trước đang dừng lại. Vui lòng thử lại sau giây lát.",
  CONTRACT_ALREADY_CONFIRMED: "Loại hợp đồng đã được xác nhận.",
  EXTRACTION_NOT_READY: "Hệ thống chưa đọc xong nội dung hợp đồng.",
  CLASSIFICATION_NOT_RETRYABLE: "AI đang nhận diện hợp đồng. Vui lòng chờ trong giây lát.",
};

export function serverCodeMessage(code?: string) {
  return code ? serverCodeMessages[code] : undefined;
}
