import { z } from "zod";

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
