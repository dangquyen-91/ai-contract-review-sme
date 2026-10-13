const { createRedactor } = require('../dist/services/ai/redaction.service');
const { contractTextQuerySchema } = require('../dist/validations/contract.validation');

test('Internal display shows account and phone suffixes; AI still receives tokens', () => {
  const source = 'STK: 0071000123456\nPhone: 0903 123 456';
  const redactor = createRedactor(source, ['bank_account', 'phone']);
  const preview = redactor.maskForDisplay(source);
  expect(preview.text).toBe('STK: •••• •••• 3456\nPhone: •••• ••• 456');
  expect(redactor.mask(source)).toBe('STK: [BANK_ACCOUNT_1]\nPhone: [PHONE_1]');
  expect(redactor.unmask(redactor.mask(source))).toBe(source);
});

test('IDs, date of birth and address stay completely hidden', () => {
  const source = 'CCCD: 079203001234\nNgày sinh: 15/08/1995\nĐịa chỉ thường trú: 123 Đường Demo, Thành phố Test';
  const redactor = createRedactor(source, ['national_id', 'date_of_birth', 'personal_address']);
  expect(redactor.maskForDisplay(source).text).toBe('CCCD: •••• •••• ••••\nNgày sinh: ••/••/••••\nĐịa chỉ thường trú: ••••••••••');
});

test('Names use aliases and emails retain only their first character and domain', () => {
  const source = 'Đại diện: Nguyễn Minh An\nEmail: minh.an@example.test';
  const preview = createRedactor(source, ['person_name', 'email']).maskForDisplay(source);
  expect(preview.text).toBe('Đại diện: Cá nhân 1\nEmail: m•••@example.test');
  expect(JSON.stringify(preview)).not.toContain('Nguyễn');
  expect(JSON.stringify(preview)).not.toContain('minh.an@example.test');
  expect(preview.text.slice(preview.spans[1].start, preview.spans[1].end)).toBe('m•••@example.test');
});

test('Different accounts sharing a suffix have consistent distinguishing labels', () => {
  const source = 'STK: 0071000123456\nSTK: 1234567893456\nThanh toán vào 0071000123456';
  const redactor = createRedactor(source, ['bank_account']);
  const preview = redactor.maskForDisplay(source);
  expect(preview.text).toBe('STK: Tài khoản 1 · •••• •••• 3456\nSTK: Tài khoản 2 · •••• •••• 3456\nThanh toán vào Tài khoản 1 · •••• •••• 3456');
  expect(redactor.mask(source)).toBe('STK: [BANK_ACCOUNT_1]\nSTK: [BANK_ACCOUNT_2]\nThanh toán vào [BANK_ACCOUNT_1]');
  for (const span of preview.spans) expect(preview.text.slice(span.start, span.end)).toMatch(/Tài khoản [12] · •••• •••• 3456/);
});

test('Phone format variants do not become fake distinct phone identities', () => {
  const source = '0903 123 456\n0903123456\n0987654456';
  const preview = createRedactor(source, ['phone']).maskForDisplay(source);
  expect(preview.text).toBe('Điện thoại 1 · •••• ••• 456\nĐiện thoại 1 · •••• ••• 456\nĐiện thoại 2 · •••• ••• 456');
});

test('An account that uses a phone number keeps the correct suffix for each field', () => {
  const source = 'STK: 0903123456\nĐiện thoại: 0903123456';
  const preview = createRedactor(source, ['bank_account', 'phone']).maskForDisplay(source);
  expect(preview.text).toBe('STK: •••• •••• 3456\nĐiện thoại: •••• ••• 456');
  expect(preview.spans.map((span) => span.type)).toEqual(['bank_account', 'phone']);
});

test('Repeated names and emails retain their labels throughout the view', () => {
  const source = 'Đại diện: Nguyễn Minh An\nĐại diện: Trần Thu Bình\nLiên hệ Nguyễn Minh An qua minh.an@example.test hoặc minh.an@example.test';
  const preview = createRedactor(source, ['person_name', 'email']).maskForDisplay(source);
  expect(preview.text).toBe('Đại diện: Cá nhân 1\nĐại diện: Cá nhân 2\nLiên hệ Cá nhân 1 qua m•••@example.test hoặc m•••@example.test');
});

test('Repeated values have consistent previews and safe offsets with no raw value metadata', () => {
  const source = 'STK: 0071000123456\nThanh toán vào 0071000123456';
  const preview = createRedactor(source, ['bank_account']).maskForDisplay(source);
  expect(preview.spans).toHaveLength(2);
  for (const span of preview.spans) {
    expect(Object.keys(span).sort()).toEqual(['end', 'start', 'type']);
    expect(preview.text.slice(span.start, span.end)).toBe('•••• •••• 3456');
  }
  expect(JSON.stringify(preview)).not.toContain('0071000123456');
});

test('Partial display respects the contract policy and leaves unrelated text unchanged', () => {
  const source = 'STK: 0071000123456\nGiá dịch vụ: 3000000 đồng';
  expect(createRedactor(source, []).maskForDisplay(source)).toEqual({ text: source, spans: [] });
  expect(createRedactor(source, ['bank_account']).maskForDisplay(source).text).toContain('3000000 đồng');
});

test('Query schema accepts supported modes and rejects arbitrary ones', () => {
  expect(contractTextQuerySchema.parse({ redacted: 'true', redactionMode: 'partial' }).redactionMode).toBe('partial');
  expect(contractTextQuerySchema.parse({ redacted: 'true', redactionMode: 'token' }).redactionMode).toBe('token');
  expect(contractTextQuerySchema.safeParse({ redacted: 'true', redactionMode: 'show-all' }).success).toBe(false);
});

test('Email display uses fixed dots for short and long addresses while AI keeps tokens', () => {
  const source = 'm@gmail.com long.name+tag@company.test';
  const redactor = createRedactor(source, ['email']);
  expect(redactor.maskForDisplay(source).text).toBe('m•••@gmail.com l•••@company.test');
  expect(redactor.mask(source)).toBe('[EMAIL_1] [EMAIL_2]');
});
