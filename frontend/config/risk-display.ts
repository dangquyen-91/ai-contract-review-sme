import type { RiskCode } from "@/types/contracts";

export const riskCodeLabels: Record<RiskCode, string> = {
  UNLAWFUL_TERM: "Trái quy định pháp luật",
  MISSING_MANDATORY_FORM: "Thiếu hình thức bắt buộc",
  UNILATERAL_TERMINATION: "Đơn phương chấm dứt",
  AUTO_RENEWAL: "Tự động gia hạn",
  EXCESSIVE_PENALTY: "Phạt quá nặng",
  LIABILITY_LIMITATION: "Giới hạn trách nhiệm",
  ONE_SIDED_INDEMNITY: "Bồi thường một chiều",
  UNFAVORABLE_PAYMENT: "Thanh toán bất lợi",
  ONE_SIDED_OBLIGATION: "Nghĩa vụ mất cân đối",
  BROAD_EXCLUSION: "Loại trừ quá rộng",
  IP_DATA_RISK: "Sở hữu trí tuệ, dữ liệu",
  UNFAVORABLE_DISPUTE_FORUM: "Giải quyết tranh chấp bất lợi",
  VAGUE_SCOPE: "Phạm vi mơ hồ",
  AMBIGUOUS_TERM: "Điều khoản mơ hồ",
  MISSING_CLAUSE: "Thiếu điều khoản",
  MISSING_PROTECTION: "Thiếu nội dung bảo vệ",
  OTHER: "Rủi ro khác",
};

export function riskCodeLabel(code?: RiskCode) {
  if (!code || code === "OTHER") return undefined;
  return riskCodeLabels[code];
}
