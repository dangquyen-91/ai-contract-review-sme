import type { TemplateCode } from "@/types/contract-drafts";

export const TEMPLATE_CATEGORIES = [
  "Bất động sản",
  "Biểu mẫu, mẫu đơn",
  "Dân sự",
  "Dịch vụ khác",
  "Doanh nghiệp",
  "Hôn nhân gia đình",
  "Lao động",
  "Thương mại",
  "Xây dựng",
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

const categoryByCode: Record<TemplateCode, TemplateCategory> = {
  labor: "Lao động",
  service: "Dịch vụ khác",
  sales: "Thương mại",
  rental: "Bất động sản",
  office_lease: "Bất động sản",
  housing_purchase: "Bất động sản",
  life_insurance: "Dân sự",
};

export const templateCategory = (code: TemplateCode) => categoryByCode[code];

/** Case- and accent-insensitive text used for searching Vietnamese titles. */
export const searchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
