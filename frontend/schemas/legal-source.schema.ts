import { z } from "zod";
import type { LegalSource, LegalSourceUpdate } from "@/types/legal-sources";

export const legalSourceSchema = z.object({
  code: z.string().trim().toLowerCase().min(2).max(60).regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, "Mã nguồn chỉ gồm chữ thường, số và dấu gạch dưới."),
  title: z.string().trim().min(2, "Tên nguồn cần ít nhất 2 ký tự.").max(300),
  citationLabel: z.string().trim().min(1, "Nhập mã trích dẫn.").max(100),
  sourceType: z.enum(["law", "decree", "circular", "resolution", "standard_template"]),
  status: z.enum(["in_force", "amended", "repealed", "not_yet_effective"]),
  documentNumber: z.string().trim().max(60).optional(),
  issuingBody: z.string().trim().max(200).optional(),
  issuedDate: z.coerce.date().optional(),
  effectiveDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
}).refine((data) => !data.effectiveDate || !data.expiryDate || data.expiryDate > data.effectiveDate, { message: "Ngày hết hiệu lực phải sau ngày hiệu lực.", path: ["expiryDate"] });

export function prepareLegalUpload(form: HTMLFormElement, metadata: boolean) {
  const body = new FormData(form);
  const file = body.get("file");
  if (!(file instanceof File) || !file.size) throw new Error("Vui lòng chọn tài liệu có nội dung.");
  if (file.size > 20 * 1024 * 1024) throw new Error("Tệp không được vượt quá 20 MB.");
  if (!["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"].includes(file.type)) throw new Error("Vui lòng chọn PDF, DOCX hoặc TXT.");
  for (const [key, value] of [...body.entries()]) {
    if (typeof value === "string") {
      if (!value.trim()) body.delete(key);
      else body.set(key, value.trim());
    }
  }
  if (body.has("expectedArticleCount")) {
    const count = Number(body.get("expectedArticleCount"));
    if (!Number.isInteger(count) || count < 1 || count > 5000) throw new Error("Số điều dự kiến phải từ 1 đến 5000.");
  }
  if (metadata) {
    const parsed = legalSourceSchema.safeParse(Object.fromEntries(body));
    if (!parsed.success) throw new Error(parsed.error.issues[0].message);
    body.set("code", parsed.data.code);
  }
  return body;
}

const dateInput = (value?: string) => value?.slice(0, 10) ?? "";

export function legalSourceFormValues(source: LegalSource) {
  return {
    title: source.title,
    citationLabel: source.citationLabel,
    sourceType: source.sourceType,
    status: source.status ?? "in_force",
    documentNumber: source.documentNumber ?? "",
    issuingBody: source.issuingBody ?? "",
    issuedDate: dateInput(source.issuedDate),
    effectiveDate: dateInput(source.effectiveDate),
    expiryDate: dateInput(source.expiryDate),
    expectedArticleCount: source.coverage?.expectedArticleCount?.toString() ?? "",
  };
}

export function prepareLegalSourceUpdate(form: HTMLFormElement, source: LegalSource): LegalSourceUpdate {
  const current = legalSourceFormValues(source);
  const body = new FormData(form);
  const next = Object.fromEntries((Object.keys(current) as (keyof typeof current)[]).map((key) => [key, String(body.get(key) ?? "").trim()])) as typeof current;
  if (next.title.length < 2 || next.title.length > 300) throw new Error("Tên nguồn cần từ 2 đến 300 ký tự.");
  if (!next.citationLabel || next.citationLabel.length > 100) throw new Error("Nhập mã trích dẫn tối đa 100 ký tự.");
  if (next.effectiveDate && next.expiryDate && next.expiryDate <= next.effectiveDate) throw new Error("Ngày hết hiệu lực phải sau ngày hiệu lực.");
  if (next.expectedArticleCount) {
    const count = Number(next.expectedArticleCount);
    if (!Number.isInteger(count) || count < 1 || count > 5000) throw new Error("Số điều dự kiến phải từ 1 đến 5000.");
  }
  const update: Record<string, unknown> = {};
  for (const key of Object.keys(current) as (keyof typeof current)[]) {
    if (next[key] === current[key]) continue;
    if (key === "expectedArticleCount") update[key] = next[key] ? Number(next[key]) : null;
    else update[key] = next[key] || null;
  }
  if (!Object.keys(update).length) throw new Error("Chưa có thay đổi nào để lưu.");
  return update as LegalSourceUpdate;
}
