import type { StudioDocument, StudioNode } from "@/types/template-studio";
import type { ContractTemplate } from "@/types/contract-drafts";
import { formatMoneyInput } from "./money-input";

export function studioInput(
  document: StudioNode,
  baseline: Record<string, string> = {},
) {
  const input = { ...baseline };
  const visit = (node: StudioNode) => {
    if (node.type === "templateField" || node.type === "templateItems")
      input[String(node.attrs?.key)] = String(node.attrs?.value ?? "");
    node.content?.forEach(visit);
  };
  visit(document);
  return input;
}

export function studioFieldText(
  key: string,
  value: string,
  template: ContractTemplate,
  format?: string,
) {
  const field = template.fields.find((item) => item.key === key);
  if (format && ["day", "month", "year"].includes(format)) {
    if (value)
      return value.split("-")[
        ({ day: 2, month: 1, year: 0 } as Record<string, number>)[format]!
      ];
    const prefix = (
      { day: "Ngay", month: "Thang", year: "Nam" } as Record<string, string>
    )[format];
    const suffix =
      key === "signingDate"
        ? ""
        : key === "startDate"
          ? "BatDau"
          : key === "endDate"
            ? "KetThuc"
            : key === "effectiveDate"
              ? "HieuLuc"
              : "Ky";
    return `[${prefix}${suffix}]`;
  }
  if (!value) return `[${field?.token ?? field?.label ?? key}]`;
  if (field?.kind === "number") return formatMoneyInput(value);
  if (field?.kind === "date") return value.split("-").reverse().join("/");
  return (
    field?.options?.find((option) => option.value === value)?.label ?? value
  );
}

export function studioCharacterCount(
  document: StudioDocument,
  template: ContractTemplate,
) {
  let count = 0;
  const visit = (node: StudioNode) => {
    count += node.text?.length ?? 0;
    if (node.type === "templateField")
      count += studioFieldText(
        String(node.attrs?.key),
        String(node.attrs?.value ?? ""),
        template,
      ).length;
    node.content?.forEach(visit);
  };
  visit(document);
  return count;
}
