import { z } from 'zod';
import { ContractTemplate, getTemplate, TemplateCode } from '../services/drafting/templates';
import { validateLineItems } from '../services/drafting/line-items';

export const draftIdSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) });
const inputSchema = z.record(z.string().trim().max(16000)).refine(value => Object.keys(value).length <= 40 && Object.entries(value).every(([key, text]) => key === 'lineItems' || text.length <= 4000));
export const createDraftSchema = z.object({
  templateCode: z.enum(['labor', 'service', 'sales']),
  title: z.string().trim().min(2).max(200),
  ourParty: z.string().min(1).max(30),
  input: inputSchema,
}).strict();
export const revisionSchema = z.object({ revision: z.number().int().min(0) }).strict();
export const updateDraftSchema = revisionSchema.extend({
  title: z.string().trim().min(2).max(200),
  input: inputSchema,
  ourParty: z.string().min(1).max(30),
  content: z.string().max(80000),
}).strict();
export const draftDecisionSchema = revisionSchema.extend({ action: z.enum(['submit', 'approve', 'return']), note: z.string().trim().max(1000).default('') }).strict();
export type DraftInput = z.infer<typeof createDraftSchema>;
const cents = (value: string) => { const [whole, fraction = ''] = value.split('.'); return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, '0')); };

export function inputErrors(code: TemplateCode, values: Record<string, string>, complete: boolean, template: ContractTemplate = getTemplate(code)) {
  const errors: string[] = [];
  const fields = new Map(template.fields.map(field => [field.key, field]));
  for (const key of Object.keys(values)) if (!fields.has(key)) errors.push(`Trường không hợp lệ: ${key}`);
  for (const field of template.fields) {
    const value = values[field.key]?.trim();
    if (complete && field.required && !value) errors.push(`Vui lòng nhập ${field.label.toLowerCase()}`);
    if (!value) continue;
    if (field.kind === 'number' && (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) <= 0 || Number(value) > 1e15)) errors.push(`${field.label} phải là số dương hợp lệ`);
    if (field.kind === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) errors.push(`${field.label} không hợp lệ`);
    if (field.options && !field.options.some(option => option.value === value)) errors.push(`${field.label} không hợp lệ`);
    if (field.kind === 'items') {
      const table = validateLineItems(value, complete);
      errors.push(...table.errors);
      if (complete && field.required && !table.items.length) errors.push('Vui lòng thêm ít nhất một dòng hàng hóa.');
      if (complete && table.total && (!/^\d+(\.\d{1,2})?$/.test(values.price ?? '') || cents(table.total) !== cents(values.price))) errors.push('Tổng giá trị trước thuế phải khớp với bảng hạng mục.');
    }
    if (complete && field.kind === 'textarea' && (/^[bcdfghjklmnpqrstvwxz]{8,}$/i.test(value) || /^(.)\1{7,}$/.test(value))) errors.push(`${field.label} đang chứa ký tự thử, vui lòng nhập nội dung có nghĩa.`);
  }
  if (values.startDate && values.endDate && values.endDate < values.startDate) errors.push('Ngày kết thúc phải từ ngày bắt đầu trở đi');
  if (code === 'labor') {
    if (complete && /^(công\s*ty|cty|doanh\s*nghiệp|tập\s*đoàn)(\s|$)/i.test(values.partnerName ?? '')) errors.push('Bên B của hợp đồng lao động phải là tên cá nhân người lao động, không phải tên công ty.');
    if (complete && /^(staff|owner|manager|expert|administrator)$/i.test(values.representative ?? '')) errors.push('Người đại diện phải là họ tên người ký, không phải vai trò tài khoản.');
    if (complete && values.termType === 'fixed' && !values.endDate) errors.push('Hợp đồng xác định thời hạn cần ngày kết thúc');
    if (values.termType === 'indefinite' && values.endDate) errors.push('Hợp đồng không xác định thời hạn phải để trống ngày kết thúc');
    if (values.termType === 'fixed' && values.startDate && values.endDate) {
      const limit = new Date(values.startDate); limit.setUTCFullYear(limit.getUTCFullYear() + 3);
      if (Date.parse(values.endDate) > limit.getTime()) errors.push('Thời hạn hợp đồng lao động không được quá 36 tháng');
    }
    if (values.partnerBirthDate && values.startDate) {
      const adult = new Date(values.partnerBirthDate); adult.setUTCFullYear(adult.getUTCFullYear() + 18);
      if (adult.getTime() > Date.parse(values.startDate)) errors.push('Mẫu này chỉ dành cho người lao động từ đủ 18 tuổi');
    }
  } else if (complete && !values.endDate) errors.push('Vui lòng nhập ngày kết thúc thực hiện');
  return errors;
}
