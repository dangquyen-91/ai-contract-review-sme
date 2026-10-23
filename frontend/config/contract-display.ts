import type { ContractRiskLevel, ContractStatus } from "@/types/contracts";

export const contractTypeLabels: Record<string, string> = {
  sales: "Mua bán hàng hóa",
  service: "Cung ứng dịch vụ",
  labor: "Hợp đồng lao động",
  office_lease: "Thuê văn phòng",
  housing_purchase: "Mua bán nhà ở",
  life_insurance: "Bảo hiểm nhân thọ",
};

export const businessTypeLabels: Record<string, string> = {
  sales: "Hợp đồng mua bán hàng hóa",
  labor: "Hợp đồng lao động",
  service: "Hợp đồng cung cấp dịch vụ",
  office_lease: "Hợp đồng thuê văn phòng, mặt bằng",
};

export const contractStatusLabels: Record<ContractStatus, string> = {
  uploaded: "Đã tải lên",
  processing: "AI đang xử lý",
  reviewed: "Đã rà soát",
  archived: "Lưu trữ",
  unsupported: "Chưa hỗ trợ",
};

export const contractRiskLabels: Record<ContractRiskLevel, string> = {
  high: "Rủi ro cao",
  medium: "Trung bình",
  low: "Rủi ro thấp",
  none: "Chưa đánh giá",
};

export const contractStatusClasses: Record<ContractStatus, string> = {
  uploaded: "text-[#53677f] bg-[#eef2f6]",
  processing: "text-[#1557ae] bg-[#e7f0ff]",
  reviewed: "text-[#206c59] bg-[#e8f5f1]",
  archived: "text-[#6a7280] bg-[#eff1f3]",
  unsupported: "text-[#875a00] bg-[#fff4dc]",
};

export const contractRiskClasses: Record<ContractRiskLevel, string> = {
  high: "text-[#a63045] bg-[#fff0f2]",
  medium: "text-[#875a00] bg-[#fff4dc]",
  low: "text-[#20705d] bg-[#e8f5f1]",
  none: "text-[#75808e] bg-[#f0f2f5]",
};

export const contractStatusTones: Record<ContractStatus, "neutral" | "info" | "success"> = {
  uploaded: "neutral", processing: "info", reviewed: "success", archived: "neutral", unsupported: "neutral",
};

export const contractRiskTones: Record<ContractRiskLevel, "danger" | "warning" | "success" | "neutral"> = {
  high: "danger", medium: "warning", low: "success", none: "neutral",
};

export function formatContractDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}
