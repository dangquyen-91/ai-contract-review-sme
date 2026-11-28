// Unit test cases for SUB-08 quoteTopUp (UTCID01–UTCID10 in the test-case sheet).
const { DAY, start, stop, missingId, business, personal, addPeriod, expectError } = require('./helpers/billing');
const { quoteTopUp } = require('../dist/services/billing/topUp.service');

const MINUTE = 60_000 / DAY; // in days
const now = new Date();
const quote = (space, packCode) => quoteTopUp(space.id, packCode, now);
async function paidCompany(options = {}) {
  const space = await business();
  return { space, period: await addPeriod(space, 'business_starter', { now, ...options }) };
}
const MISMATCH = 'Gói mua thêm lượt không phù hợp với tài khoản này.';
const NEED_PLAN = 'Cần gói trả phí đang hoạt động để mua thêm lượt. Vui lòng mua hoặc nâng cấp gói.';

beforeAll(start);
afterAll(stop);

test('UTCID01: an organization with a paid plan can buy a business pack', async () => {
  const { space, period } = await paidCompany();
  const result = await quote(space, 'business_analysis_50');
  expect(result.pack).toMatchObject({ code: 'business_analysis_50', kind: 'analysis', units: 50, price: 199000 });
  expect(result.periodId).toBe(period.id);
});

test('UTCID02: a personal account with Personal Pro can buy a personal pack', async () => {
  const space = await personal();
  const period = await addPeriod(space, 'personal_pro', { now });
  const result = await quote(space, 'personal_chat_100');
  expect(result.pack).toMatchObject({ kind: 'chat', units: 100, price: 29000 });
  expect(result.periodId).toBe(period.id);
});

test('UTCID03: exactly 30 minutes before the period ends is accepted', async () => {
  const { space, period } = await paidCompany({ to: 30 * MINUTE });
  expect((await quote(space, 'business_chat_300')).periodId).toBe(period.id);
});

test('UTCID04: 29 minutes before the period ends is rejected', async () => {
  const { space } = await paidCompany({ to: 29 * MINUTE });
  await expectError(quote(space, 'business_chat_300'),
    'Kỳ hiện tại sắp kết thúc. Vui lòng gia hạn gói thay vì mua thêm lượt.', 409, 'PERIOD_ENDING');
});

test('UTCID05: a personal pack is rejected for an organization', async () => {
  const { space } = await paidCompany();
  await expectError(quote(space, 'personal_analysis_10'), MISMATCH, 400);
});

test('UTCID06: a pack that does not exist is rejected', async () => {
  const { space } = await paidCompany();
  await expectError(quote(space, 'gold'), MISMATCH, 400);
});

test('UTCID07: an organization without a plan is rejected', async () => {
  await expectError(quote(await business(), 'business_analysis_50'), NEED_PLAN, 403, 'PAID_PLAN_REQUIRED');
});

test('UTCID08: an organization in its trial is rejected', async () => {
  const space = await business();
  await addPeriod(space, 'business_trial', { from: -1, to: 6, now });
  await expectError(quote(space, 'business_analysis_50'), NEED_PLAN, 403, 'PAID_PLAN_REQUIRED');
});

test('UTCID09: Personal Free is rejected', async () => {
  await expectError(quote(await personal(), 'personal_analysis_10'), NEED_PLAN, 403, 'PAID_PLAN_REQUIRED');
});

test('UTCID10: an account that does not exist is not found', async () => {
  await expectError(quote({ id: missingId() }, 'business_analysis_50'),
    'Không tìm thấy tài khoản quản lý gói dịch vụ.', 404);
});
