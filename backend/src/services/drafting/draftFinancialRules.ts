import type { ContractTemplate } from './templates';
import { moneyToCents } from './line-items';

const isAmount = (value: string | undefined): value is string =>
  !!value && /^\d+(\.\d{1,2})?$/.test(value) && Number(value) <= 1e15;

export function draftFinancialErrors(
  template: ContractTemplate,
  values: Record<string, string>,
  complete: boolean,
): string[] {
  const errors: string[] = [];
  // New rules apply only to the matching snapshot version, never silently to older drafts.
  if (template.code === 'sales' && template.version >= 4) {
    for (const [key, maximum, label] of [
      ['vatRate', 100, 'Thuế suất VAT'],
      ['advancePercent', 100, 'Tỷ lệ tạm ứng'],
      ['penaltyPercent', 8, 'Mức phạt vi phạm'],
    ] as const) {
      const value = values[key];
      if (value && (!isAmount(value) || Number(value) > maximum))
        errors.push(`${label} phải từ 0 đến ${maximum}%.`);
    }
    if (values.transportCostParty && !['A', 'B'].includes(values.transportCostParty))
      errors.push('Bên chịu phí vận chuyển phải là A hoặc B.');
    for (const key of [
      'advanceDays',
      'remainingDays',
      'deliveryDays',
      'complaintDays',
      'replacementDays',
      'warrantyMonths',
      'warrantyResponseDays',
    ]) {
      if (values[key] && (!/^\d+$/.test(values[key]) || Number(values[key]) > 1e6))
        errors.push(
          `${template.fields.find((field) => field.key === key)?.label ?? key} phải là số nguyên không âm hợp lệ.`,
        );
    }
    const { price, vatAmount, totalPrice, advanceAmount, remainingAmount, advancePercent } = values;
    if (
      complete &&
      isAmount(price) &&
      isAmount(vatAmount) &&
      isAmount(totalPrice) &&
      moneyToCents(price) + moneyToCents(vatAmount) !== moneyToCents(totalPrice)
    )
      errors.push('Tổng thanh toán phải bằng giá trị trước thuế cộng tiền VAT.');
    if (
      complete &&
      isAmount(advanceAmount) &&
      isAmount(remainingAmount) &&
      isAmount(totalPrice) &&
      moneyToCents(advanceAmount) + moneyToCents(remainingAmount) !== moneyToCents(totalPrice)
    )
      errors.push('Tiền tạm ứng cộng tiền còn lại phải bằng tổng thanh toán.');
    if (
      complete &&
      isAmount(advanceAmount) &&
      isAmount(totalPrice) &&
      moneyToCents(totalPrice) > 0n &&
      isAmount(advancePercent)
    ) {
      const actualPercent =
        (moneyToCents(advanceAmount) * 10000n + moneyToCents(totalPrice) / 2n) /
        moneyToCents(totalPrice);
      if (actualPercent !== moneyToCents(advancePercent))
        errors.push(
          'Tỷ lệ tạm ứng phải khớp số tiền tạm ứng trên tổng thanh toán (làm tròn 2 chữ số).',
        );
    }
  }
  if (template.code === 'housing_purchase' && template.version >= 2) {
    if (
      complete &&
      values.transactionStage === 'deposit' &&
      Number(values.depositAmount ?? '0') <= 0
    )
      errors.push('Giai đoạn đặt cọc cần số tiền đặt cọc lớn hơn 0.');
    if (
      complete &&
      isAmount(values.depositAmount) &&
      isAmount(values.price) &&
      moneyToCents(values.depositAmount) > moneyToCents(values.price)
    )
      errors.push('Tiền đặt cọc không được vượt giá mua bán trong mẫu này.');
  }
  return errors;
}
