import type { ContractTemplate } from "@/types/contract-drafts";

/** The category a template is shown under; the server always sends one. */
export const templateCategory = (template: Pick<ContractTemplate, "category">) => template.category?.trim() || "Khác";

/** Categories that currently hold at least one template, in Vietnamese order. */
export function libraryCategories(templates: Pick<ContractTemplate, "category">[]) {
  return [...new Set(templates.map(templateCategory))].sort((a, b) => a.localeCompare(b, "vi"));
}

/** Case- and accent-insensitive text used for searching Vietnamese titles. */
export const searchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
