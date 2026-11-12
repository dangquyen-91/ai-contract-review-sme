process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'sales-test-access';
process.env.JWT_REFRESH_SECRET = 'sales-test-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 8).toString('base64');
const JSZip = require('jszip');
const { getTemplate } = require('../dist/services/drafting/templates');
const { buildStudioTemplate } = require('../dist/services/drafting/studioTemplate');
const { studioText, studioInput } = require('../dist/services/drafting/studioDocument');
const { createStudioDocx } = require('../dist/services/drafting/studioDocx.service');
const { inputErrors } = require('../dist/services/drafting/draftInputRules');

const template = getTemplate('sales');
const values = {
  companyName: 'Doanh nghiệp của tôi', partnerName: 'Đối tác mua bán',
  representative: 'Đại diện của tôi', partnerRepresentative: 'Đại diện đối tác',
  reference: 'MB-001', signingDate: '2026-11-02', price: '10000000', vatAmount: '0',
  totalPrice: '10000000', advanceAmount: '0', remainingAmount: '10000000', storageFee: '0',
  lineItems: JSON.stringify([{ name: 'Thiết bị kiểm thử, xuất xứ Việt Nam', unit: 'Bộ', quantity: '2', unitPrice: '5000000' }]),
};

test.each(['seller', 'buyer'])('sales reference keeps seller A and buyer B when our party is %s', (party) => {
  const document = buildStudioTemplate(template, values, values.companyName, party);
  const content = studioText(document, template);
  const seller = content.slice(content.indexOf('BÊN A (BÊN BÁN)'), content.indexOf('BÊN B (BÊN MUA)'));
  const buyer = content.slice(content.indexOf('BÊN B (BÊN MUA)'), content.indexOf('ĐIỀU 1.'));
  expect(seller).toContain(party === 'seller' ? values.companyName : values.partnerName);
  expect(buyer).toContain(party === 'buyer' ? values.companyName : values.partnerName);
  expect(seller).toContain(party === 'seller' ? values.representative : values.partnerRepresentative);
  expect(buyer).toContain(party === 'buyer' ? values.representative : values.partnerRepresentative);
  expect(content.match(/ĐIỀU \d+\./g)).toHaveLength(15);
  expect(content).toContain('ĐIỀU 15. ĐIỀU KHOẢN THI HÀNH');
  expect(content).toContain('PHỤ LỤC 01');
  expect(content).toContain('48 (bốn mươi tám) giờ');
  expect(content).not.toMatch(/\{\{|\.{4,}/);
  expect(document.content.filter(node => node.type === 'pageBreak')).toHaveLength(1);
  const input = studioInput(document);
  for (const field of template.fields) expect(input).toHaveProperty(field.key);
  expect(input.price).toBe('10000000');
  expect(input.companyName).toBe(values.companyName);
});

test('sales Word export contains the appendix table, repeated linked amounts and two signature areas', async () => {
  const document = buildStudioTemplate(template, values, values.companyName, 'buyer');
  const zip = await JSZip.loadAsync(await createStudioDocx(document, template));
  const xml = await zip.file('word/document.xml').async('string');
  expect(xml).toContain('w:type="page"');
  expect(xml).toContain('PHỤ LỤC 01');
  expect(xml).toContain('Thiết bị kiểm thử, xuất xứ Việt Nam');
  expect(xml.match(/10\.000\.000/g).length).toBeGreaterThanOrEqual(4);
  expect(xml.match(/BÊN BÁN \(BÊN A\)/g)).toHaveLength(2);
  expect(xml.match(/BÊN MUA \(BÊN B\)/g)).toHaveLength(2);
});

test('sales allows zero VAT and advance while still checking the goods-table total', () => {
  expect(inputErrors('sales', values, false)).toEqual([]);
  expect(inputErrors('sales', { ...values, advanceAmount: '-1' }, false).some(error => error.includes('tạm ứng'))).toBe(true);
  expect(inputErrors('sales', { ...values, price: '1' }, true)).toContain('Tổng giá trị trước thuế phải khớp với bảng hạng mục.');
});
