const JSZip = require('jszip');
const { getTemplate } = require('../dist/services/drafting/templates');
const { inputErrors } = require('../dist/services/drafting/draftInputRules');
const { buildStudioTemplate } = require('../dist/services/drafting/studioTemplate');
const { studioText, studioInput } = require('../dist/services/drafting/studioDocument');
const { createStudioDocx } = require('../dist/services/drafting/studioDocx.service');

function completeInput(code) {
  const template = getTemplate(code);
  const input = Object.fromEntries(template.fields.filter(field => field.required).map(field => [field.key,
    field.options ? field.options[0].value : field.kind === 'date' ? '2026-11-15' :
      field.kind === 'number' ? '10000000' : field.kind === 'items' ?
        JSON.stringify([{ name: 'Hàng hóa', unit: 'cái', quantity: '1', unitPrice: '10000000' }]) : 'Nội dung đã thống nhất',
  ]));
  if (template.fields.some(field => field.key === 'endDate')) input.endDate = '2027-11-15';
  if (code === 'sales') Object.assign(input, {
    vatRate: '10', vatAmount: '1000000', totalPrice: '11000000', advanceAmount: '3300000',
    advancePercent: '30', remainingAmount: '7700000', storageFee: '0', penaltyPercent: '8',
    advanceDays: '3', remainingDays: '7', deliveryDays: '7', complaintDays: '30',
    replacementDays: '7', warrantyMonths: '12', warrantyResponseDays: '3', transportCostParty: 'A',
  });
  return input;
}

test.each(['sales', 'service', 'office_lease', 'housing_purchase', 'life_insurance'])(
  '%s complete input survives linked editor fields and Word export', async code => {
    const template = getTemplate(code);
    const input = completeInput(code);
    expect(inputErrors(code, input, true)).toEqual([]);
    const document = buildStudioTemplate(template, input, 'Doanh nghiệp thử', template.parties[0].code);
    const linked = studioInput(document);
    for (const field of template.fields.filter(field => field.required)) expect(linked[field.key]).toBe(input[field.key]);
    const zip = await JSZip.loadAsync(await createStudioDocx(document, template));
    const xml = await zip.file('word/document.xml').async('string');
    expect(xml).toContain('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
    expect(studioText(document, template)).not.toMatch(/\{\{/);
  },
);

test.each([
  ['totalPrice', '11000001', 'Tổng thanh toán'],
  ['remainingAmount', '7700001', 'Tiền tạm ứng cộng tiền còn lại'],
  ['advancePercent', '31', 'Tỷ lệ tạm ứng phải khớp'],
  ['penaltyPercent', '8.01', 'Mức phạt vi phạm'],
  ['penaltyPercent', '-1', 'Mức phạt vi phạm'],
  ['vatRate', '101', 'Thuế suất VAT'],
  ['advancePercent', 'abc', 'Tỷ lệ tạm ứng'],
  ['transportCostParty', 'C', 'Bên chịu phí vận chuyển'],
  ['deliveryDays', '1.5', 'Số ngày'],
])('sales rejects invalid %s=%s', (key, value, marker) => {
  expect(inputErrors('sales', { ...completeInput('sales'), [key]: value }, true).some(error => error.includes(marker))).toBe(true);
});

test('sales checks decimal currency without floating point drift and allows a zero advance', () => {
  const input = { ...completeInput('sales'), price: '0.10', vatAmount: '0.20', totalPrice: '0.30', advanceAmount: '0', remainingAmount: '0.30', advancePercent: '0', penaltyPercent: '0',
    lineItems: JSON.stringify([{ name: 'Hàng hóa', unit: 'cái', quantity: '1', unitPrice: '0.10' }]) };
  expect(inputErrors('sales', input, true)).toEqual([]);
  expect(inputErrors('sales', { ...input, price: '0.11' }, false)).toEqual([]); // Temporary edits can be saved.
});

test('new financial rules do not retroactively reject a saved sales v3 snapshot', () => {
  const template = { ...getTemplate('sales'), version: 3 };
  const input = { ...completeInput('sales'), totalPrice: '999', advancePercent: 'word', penaltyPercent: '9' };
  expect(inputErrors('sales', input, true, template)).toEqual([]);
});

test('housing distinguishes deposit and purchase without imposing a universal 5% deposit cap', () => {
  const input = { ...completeInput('housing_purchase'), transactionStage: 'purchase', depositAmount: '0' };
  expect(inputErrors('housing_purchase', input, true)).toEqual([]);
  expect(inputErrors('housing_purchase', { ...input, transactionStage: 'deposit' }, true)).toContain('Giai đoạn đặt cọc cần số tiền đặt cọc lớn hơn 0.');
  expect(inputErrors('housing_purchase', { ...input, transactionStage: 'deposit', depositAmount: '1000000' }, true)).toEqual([]);
  expect(inputErrors('housing_purchase', { ...input, depositAmount: '10000001' }, true)).toContain('Tiền đặt cọc không được vượt giá mua bán trong mẫu này.');
  expect(inputErrors('housing_purchase', { ...input, transactionStage: 'unknown' }, true)).toContain('Giai đoạn giao dịch không hợp lệ');
});

test('insurance receipt date is optional but preserved for calculating the actual consideration window', () => {
  const template = getTemplate('life_insurance');
  const input = { ...completeInput('life_insurance'), receivedDate: '2026-11-16' };
  expect(inputErrors(template.code, input, true)).toEqual([]);
  const document = buildStudioTemplate(template, input, '', 'policyholder');
  expect(studioInput(document).receivedDate).toBe(input.receivedDate);
  expect(studioText(document, template)).toContain('16/11/2026');
  expect(inputErrors(template.code, { ...input, receivedDate: '2026-02-30' }, false)).toContain('Ngày thực nhận hợp đồng (nếu đã nhận) không hợp lệ');
});
