import { z } from 'zod';
import { getTemplate } from '../services/drafting/templates';
import { buildStudioTemplate } from '../services/drafting/studioTemplate';
import { studioInput, studioText } from '../services/drafting/studioDocument';
import { inputErrors } from '../services/drafting/draftInputRules';

export const managedTemplateCodes = [
  'labor',
  'service',
  'sales',
  'office_lease',
  'housing_purchase',
  'life_insurance',
] as const;
const key = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,59}$/);
const fieldSchema = z
  .object({
    key,
    label: z.string().trim().min(1).max(200),
    kind: z.enum(['text', 'textarea', 'date', 'number', 'select', 'items']),
    required: z.boolean(),
    group: z.enum(['parties', 'terms']),
    options: z
      .array(
        z.object({ value: z.string().min(1).max(60), label: z.string().min(1).max(100) }).strict(),
      )
      .max(20)
      .optional(),
    placeholder: z.string().max(500).optional(),
    help: z.string().max(1000).optional(),
    defaultValue: z.string().max(4000).optional(),
    token: z.string().max(100).optional(),
  })
  .strict();
export const templateDefinitionSchema = z
  .object({
    code: z.enum(managedTemplateCodes),
    name: z.string().trim().min(2).max(160),
    description: z.string().trim().min(2).max(1000),
    legalBasis: z.string().trim().min(2).max(4000),
    fields: z.array(fieldSchema).min(1).max(64),
    sections: z
      .array(
        z
          .object({
            key,
            title: z.string().trim().min(1).max(200),
            body: z.string().trim().min(1).max(12000),
            guidance: z.string().max(2000).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(20),
    reviewNotes: z.array(z.string().max(1000)).max(10).default([]),
  })
  .strict()
  .superRefine((value, context) => {
    const issue = (message: string) => context.addIssue({ code: z.ZodIssueCode.custom, message });
    if (JSON.stringify(value).length > 100000) issue('Mẫu vượt dung lượng cho phép.');
    const base = getTemplate(value.code);
    const keys = new Set(value.fields.map((field) => field.key));
    if (keys.size !== value.fields.length) issue('Tên ô thông tin không được trùng.');
    if (new Set(value.sections.map((section) => section.key)).size !== value.sections.length)
      issue('Mã điều khoản không được trùng.');
    for (const original of base.fields) {
      const field = value.fields.find((item) => item.key === original.key);
      if (!field || field.kind !== original.kind || (original.required && !field.required))
        issue(`Phải giữ ô thông tin nền và kiểu dữ liệu: ${original.label}.`);
      if (original.options && JSON.stringify(field?.options) !== JSON.stringify(original.options))
        issue(`Không thay đổi các giá trị nghiệp vụ của ${original.label}.`);
    }
    for (const field of value.fields) {
      if (
        field.kind === 'select' &&
        (!field.options?.length ||
          new Set(field.options.map((item) => item.value)).size !== field.options.length)
      )
        issue(`Các lựa chọn của ${field.label} phải đầy đủ và không trùng.`);
      if (
        field.defaultValue &&
        field.options &&
        !field.options.some((item) => item.value === field.defaultValue)
      )
        issue(`Giá trị mặc định của ${field.label} không nằm trong lựa chọn.`);
      if (
        !base.fields.some((item) => item.key === field.key) &&
        !value.sections.some((item) => item.body.includes(`{{${field.key}}}`))
      )
        issue(`Hãy chèn ô ${field.label} vào ít nhất một điều khoản.`);
    }
    for (const section of value.sections) {
      for (const match of section.body.matchAll(/\{\{([^{}]+)\}\}/g)) {
        const [key, format, extra] = match[1].split(':');
        const validFormat =
          !format ||
          (!extra &&
            ['day', 'month', 'year'].includes(format) &&
            value.fields.some((field) => field.key === key && field.kind === 'date'));
        if ((!keys.has(key) && !['supplierRole', 'recipientRole'].includes(key)) || !validFormat)
          issue(`Điều khoản tham chiếu ô không tồn tại hoặc sai định dạng: ${match[1]}.`);
      }
      if (/<\/?(?:script|iframe|style)\b/i.test(section.body))
        issue('Nội dung không được chứa mã thực thi.');
    }
    const resolved = { ...base, ...value };
    for (const error of inputErrors(
      value.code,
      Object.fromEntries(
        value.fields
          .filter((field) => field.defaultValue)
          .map((field) => [field.key, field.defaultValue!]),
      ),
      false,
      resolved,
    ))
      issue(`Giá trị mặc định: ${error}`);
    try {
      const document = buildStudioTemplate(resolved, {}, '', base.parties[0].code);
      const rendered = studioInput(document);
      if (studioText(document, resolved).length > 80000)
        issue('Nội dung mẫu hiển thị vượt 80.000 ký tự.');
      for (const field of value.fields.filter((item) => item.required))
        if (!(field.key in rendered))
          issue(`Ô bắt buộc phải xuất hiện trong hợp đồng: ${field.label}.`);
    } catch {
      issue('Cấu trúc mẫu không thể hiển thị trong trình soạn hợp đồng.');
    }
  });
export const managedTemplateIdSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) });
export const managedTemplateRevisionSchema = z
  .object({ revision: z.number().int().nonnegative() })
  .strict();
export const saveManagedTemplateSchema = managedTemplateRevisionSchema
  .extend({ definition: templateDefinitionSchema })
  .strict();
export const createManagedTemplateSchema = z
  .object({ code: z.enum(managedTemplateCodes), name: z.string().trim().min(2).max(160) })
  .strict();
export const managedTemplateListSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  q: z.string().trim().max(160).default(''),
});
export type TemplateDefinition = z.infer<typeof templateDefinitionSchema>;
