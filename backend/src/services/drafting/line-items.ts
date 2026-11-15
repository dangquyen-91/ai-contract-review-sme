import { z } from 'zod';

const itemSchema = z.object({ name: z.string().trim().max(160), unit: z.string().trim().max(30), quantity: z.string().max(20), unitPrice: z.string().max(24) }).strict();
export type DraftLineItem = z.infer<typeof itemSchema>;
const hundred = BigInt(100), thousand = BigInt(1000);
const scale = (value: string, decimals: number) => { const [whole, fraction = ''] = value.split('.'); return BigInt(whole) * BigInt(10 ** decimals) + BigInt(fraction.padEnd(decimals, '0')); };
export function moneyString(cents: bigint) {
  const fraction = (cents % hundred).toString().padStart(2, '0');
  return `${cents / hundred}${fraction === '00' ? '' : `.${fraction}`}`;
}
export function displayMoney(value: string) {
  const [whole, fraction] = value.split('.');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (fraction ? `,${fraction}` : '');
}
export function validateLineItems(raw: string, complete: boolean) {
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return { errors: ['Bảng hạng mục không hợp lệ.'], items: [] as DraftLineItem[], total: '' }; }
  const parsed = z.array(itemSchema).max(20).safeParse(data);
  if (!parsed.success) return { errors: ['Bảng hạng mục tối đa 20 dòng; kiểm tra tên, đơn vị tính, số lượng và đơn giá.'], items: [] as DraftLineItem[], total: '' };
  const errors: string[] = [];
  let total = BigInt(0), valid = true;
  for (const [index, item] of parsed.data.entries()) {
    const numeric = /^\d+(\.\d{1,3})?$/.test(item.quantity) && /^\d+(\.\d{1,2})?$/.test(item.unitPrice) && Number(item.quantity) > 0 && Number(item.quantity) <= 1000000 && Number(item.unitPrice) > 0 && Number(item.unitPrice) <= 1e12;
    if (!numeric || !item.name || !item.unit) {
      valid = false;
      if (complete) errors.push(`Dòng ${index + 1}: nhập tên, đơn vị tính, số lượng và đơn giá dương hợp lệ.`);
    } else total += (scale(item.quantity, 3) * scale(item.unitPrice, 2) + BigInt(500)) / thousand;
  }
  if (total > BigInt('100000000000000000')) errors.push('Tổng giá trị bảng hạng mục vượt giới hạn cho phép.');
  return { errors, items: parsed.data, total: valid && parsed.data.length ? moneyString(total) : '' };
}
export function lineItemsTable(raw: string) {
  const result = validateLineItems(raw, true);
  if (result.errors.length || !result.items.length) return '';
  const clean = (value: string) => value.replace(/[|\t\r\n]/g, ' ');
  const rows = result.items.map((item, index) => {
    const amount = moneyString((scale(item.quantity, 3) * scale(item.unitPrice, 2) + BigInt(500)) / thousand);
    return `| ${index + 1} | ${clean(item.name)} | ${clean(item.unit)} | ${item.quantity.replace('.', ',')} | ${displayMoney(item.unitPrice)} | ${displayMoney(amount)} |`;
  });
  return ['| STT | Tên hàng hóa / dịch vụ | ĐVT | Số lượng | Đơn giá (VND) | Thành tiền (VND) |', ...rows].join('\n');
}
