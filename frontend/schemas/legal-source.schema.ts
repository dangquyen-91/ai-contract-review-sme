import { z } from "zod";
import type { LegalSource, LegalSourceOrigin, LegalSourcePublisher, LegalSourceUpdate } from "@/types/legal-sources";

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Ngày không tồn tại.")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

export const legalSourceSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toLowerCase()
      .min(2)
      .max(60)
      .regex(
        /^[a-z0-9]+(?:_[a-z0-9]+)*$/,
        "Mã nguồn chỉ gồm chữ thường, số và dấu gạch dưới.",
      ),
    title: z.string().trim().min(2, "Tên nguồn cần ít nhất 2 ký tự.").max(300),
    citationLabel: z.string().trim().min(1, "Nhập mã trích dẫn.").max(100),
    sourceType: z.enum([
      "law",
      "decree",
      "circular",
      "resolution",
      "standard_template",
    ]),
    status: z.enum(["in_force", "amended", "repealed", "not_yet_effective"]),
    documentNumber: z.string().trim().max(60).optional(),
    issuingBody: z.string().trim().max(200).optional(),
    issuedDate: calendarDate.optional(),
    effectiveDate: calendarDate.optional(),
    expiryDate: calendarDate.optional(),
  })
  .refine(
    (data) =>
      !data.effectiveDate ||
      !data.expiryDate ||
      data.expiryDate > data.effectiveDate,
    {
      message: "Ngày hết hiệu lực phải sau ngày hiệu lực.",
      path: ["expiryDate"],
    },
  );

const publishers: readonly string[] = ["official_gazette", "national_database", "issuing_authority", "other"] satisfies LegalSourcePublisher[];

const httpUrl = z.string().max(500).url().regex(/^https?:\/\//i);

export const legalOriginFields = ["originPublisher", "originUrl", "originRetrievedAt"] as const;

type OriginValues = Partial<Record<(typeof legalOriginFields)[number] | "gazette", string>>;

// Mirrors the backend rule: a source needs a publisher and a link, except a
// printed Công báo issue, which may give the gazette number instead.
export function readLegalOrigin(values: OriginValues, required: boolean): LegalSourceOrigin | undefined {
  const publisher = values.originPublisher?.trim() ?? "";
  const url = values.originUrl?.trim() ?? "";
  const retrievedAt = values.originRetrievedAt?.trim() ?? "";
  const gazette = values.gazette?.trim() ?? "";
  if (!publisher && !url && !retrievedAt) {
    if (required) throw new Error("Chọn nơi lấy văn bản và nhập đường link văn bản.");
    return undefined;
  }
  if (!publishers.includes(publisher)) throw new Error("Chọn nơi lấy văn bản.");
  if (url && !httpUrl.safeParse(url).success)
    throw new Error("Đường link văn bản phải bắt đầu bằng http:// hoặc https:// và không quá 500 ký tự.");
  if (!url && !(publisher === "official_gazette" && gazette))
    throw new Error("Nhập đường link văn bản. Nếu lấy từ Công báo bản in, ghi số Công báo thay cho đường link.");
  if (retrievedAt) {
    const date = calendarDate.safeParse(retrievedAt);
    if (!date.success) throw new Error("Ngày truy cập không hợp lệ.");
    if (date.data.getTime() > Date.now()) throw new Error("Ngày truy cập không được sau hôm nay.");
  }
  return {
    publisher: publisher as LegalSourcePublisher,
    ...(url ? { url } : {}),
    ...(retrievedAt ? { retrievedAt } : {}),
  };
}

export function prepareLegalUpload(form: HTMLFormElement, metadata: boolean) {
  const body = new FormData(form);
  const file = body.get("file");
  if (!(file instanceof File) || !file.size)
    throw new Error("Vui lòng chọn tài liệu có nội dung.");
  if (file.size > 20 * 1024 * 1024)
    throw new Error("Tệp không được vượt quá 20 MB.");
  if (
    ![
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ].includes(file.type)
  )
    throw new Error("Vui lòng chọn PDF, DOCX hoặc TXT.");
  for (const [key, value] of [...body.entries()]) {
    if (typeof value === "string") {
      if (!value.trim()) body.delete(key);
      else body.set(key, value.trim());
    }
  }
  if (body.has("expectedArticleCount")) {
    const count = Number(body.get("expectedArticleCount"));
    if (!Number.isInteger(count) || count < 1 || count > 5000)
      throw new Error("Số điều dự kiến phải từ 1 đến 5000.");
  }
  const originValues: OriginValues = { gazette: String(body.get("gazette") ?? "") };
  for (const key of legalOriginFields) {
    originValues[key] = String(body.get(key) ?? "");
    body.delete(key);
  }
  if (metadata) {
    const parsed = legalSourceSchema.safeParse(Object.fromEntries(body));
    if (!parsed.success) throw new Error(parsed.error.issues[0].message);
    body.set("code", parsed.data.code);
    if (String(body.get("gazette") ?? "").length > 200)
      throw new Error("Số Công báo tối đa 200 ký tự.");
    body.set("origin", JSON.stringify(readLegalOrigin(originValues, true)));
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
    gazette: source.gazette ?? "",
    originPublisher: source.origin?.publisher ?? "",
    originUrl: source.origin?.url ?? "",
    originRetrievedAt: dateInput(source.origin?.retrievedAt),
    expectedArticleCount:
      source.coverage?.expectedArticleCount?.toString() ?? "",
  };
}

export function prepareLegalSourceUpdate(
  form: HTMLFormElement,
  source: LegalSource,
): LegalSourceUpdate {
  const current = legalSourceFormValues(source);
  const body = new FormData(form);
  const next = Object.fromEntries(
    (Object.keys(current) as (keyof typeof current)[]).map((key) => [
      key,
      String(body.get(key) ?? "").trim(),
    ]),
  ) as typeof current;
  for (const key of ["issuedDate", "effectiveDate", "expiryDate"] as const) {
    if (next[key] && !calendarDate.safeParse(next[key]).success)
      throw new Error("Ngày văn bản không hợp lệ.");
  }
  if (next.title.length < 2 || next.title.length > 300)
    throw new Error("Tên nguồn cần từ 2 đến 300 ký tự.");
  if (!next.citationLabel || next.citationLabel.length > 100)
    throw new Error("Nhập mã trích dẫn tối đa 100 ký tự.");
  if (
    next.effectiveDate &&
    next.expiryDate &&
    next.expiryDate <= next.effectiveDate
  )
    throw new Error("Ngày hết hiệu lực phải sau ngày hiệu lực.");
  if (next.expectedArticleCount) {
    const count = Number(next.expectedArticleCount);
    if (!Number.isInteger(count) || count < 1 || count > 5000)
      throw new Error("Số điều dự kiến phải từ 1 đến 5000.");
  }
  if (next.gazette.length > 200) throw new Error("Số Công báo tối đa 200 ký tự.");
  const update: Record<string, unknown> = {};
  const originChanged = legalOriginFields.some((key) => next[key] !== current[key]);
  if (originChanged || next.gazette !== current.gazette) {
    // A source that already has an origin cannot lose it; older sources may stay without one.
    const origin = readLegalOrigin(next, Boolean(source.origin?.publisher));
    if (originChanged && origin) update.origin = origin;
  }
  const originKeys: readonly string[] = legalOriginFields;
  for (const key of Object.keys(current) as (keyof typeof current)[]) {
    if (next[key] === current[key] || originKeys.includes(key)) continue;
    if (key === "expectedArticleCount")
      update[key] = next[key] ? Number(next[key]) : null;
    else update[key] = next[key] || null;
  }
  if (!Object.keys(update).length)
    throw new Error("Chưa có thay đổi nào để lưu.");
  return update as LegalSourceUpdate;
}
