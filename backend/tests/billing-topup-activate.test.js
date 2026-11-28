// Unit test cases for SUB-09 activateTopUp (UTCID01–UTCID10 in the test-case sheet).
const { start, stop, nextNumber, business, addPeriod, periodById, expectError, UsageTopUpModel } = require('./helpers/billing');
const { activateTopUp } = require('../dist/services/billing/topUp.service');

const activate = (space, fields = {}) =>
  activateTopUp({
    orgId: space.id, packCode: 'business_analysis_50', amount: 199000, paymentReference: `topup-${nextNumber()}`, ...fields,
  });
async function paidCompany(options) {
  const space = await business();
  return { space, period: await addPeriod(space, 'business_starter', options) };
}
const creditsOf = (space) => UsageTopUpModel.countDocuments({ orgId: space.id });
const bonusOf = async (period) => (await periodById(period)).analysisBonus;
const REUSED = 'Mã tham chiếu thanh toán đã được dùng cho giao dịch khác.';
const NO_PERIOD = 'Không tìm thấy kỳ gói để cộng lượt mua thêm.';

beforeAll(start);
afterAll(stop);

test('UTCID01: the units are added to the active paid period and recorded', async () => {
  const { space, period } = await paidCompany();
  const credit = await activate(space);
  expect(credit).toMatchObject({ kind: 'analysis', units: 50, amount: 199000, packCode: 'business_analysis_50' });
  expect(String(credit.periodId)).toBe(period.id);
  expect(await bonusOf(period)).toBe(50);
});

test('UTCID02: a second purchase adds to the first', async () => {
  const { space, period } = await paidCompany();
  await activate(space);
  await activate(space);
  expect(await bonusOf(period)).toBe(100);
  expect(await creditsOf(space)).toBe(2);
});

test('UTCID03: the same payment activated twice is credited once', async () => {
  const { space, period } = await paidCompany();
  const first = await activate(space, { paymentReference: 'topup-twice' });
  const second = await activate(space, { paymentReference: 'topup-twice' });
  expect(second.id).toBe(first.id);
  expect(await bonusOf(period)).toBe(50);
});

test('UTCID04: when a newer period is active the units go to that period', async () => {
  const { space, period: old } = await paidCompany({ from: -31, to: -1 });
  const active = await addPeriod(space, 'business_starter', { from: -1, to: 29 });
  await activate(space, { periodId: old.id });
  expect(await bonusOf(active)).toBe(50);
  expect(await bonusOf(old)).toBe(0);
});

test('UTCID05: a late payment without an active period is credited to the period it was bought for', async () => {
  const { space, period: ended } = await paidCompany({ from: -31, to: -1 });
  await activate(space, { periodId: ended.id });
  expect(await bonusOf(ended)).toBe(50);
});

test('UTCID06: a payment reference used for another pack is rejected', async () => {
  const { space, period } = await paidCompany();
  await activate(space, { paymentReference: 'topup-other-pack' });
  await expectError(activate(space, { paymentReference: 'topup-other-pack', packCode: 'business_chat_300' }), REUSED, 409);
  expect((await periodById(period)).chatBonus).toBe(0);
});

test('UTCID07: a payment reference used by another organization is rejected', async () => {
  const [first, second] = [await paidCompany(), await paidCompany()];
  await activate(first.space, { paymentReference: 'topup-other-org' });
  await expectError(activate(second.space, { paymentReference: 'topup-other-org' }), REUSED, 409);
  expect(await bonusOf(second.period)).toBe(0);
});

test('UTCID08: a pack that no longer exists is rejected', async () => {
  const { space, period } = await paidCompany();
  await expectError(activate(space, { packCode: 'gold' }), 'Gói mua thêm lượt không còn tồn tại.', 409);
  expect(await bonusOf(period)).toBe(0);
});

test('UTCID09: without any period to credit the payment is rejected', async () => {
  const space = await business();
  await expectError(activate(space), NO_PERIOD, 409);
  expect(await creditsOf(space)).toBe(0);
});

test('UTCID10: the period of another organization cannot be credited', async () => {
  const space = await business();
  const other = await paidCompany();
  await expectError(activate(space, { periodId: other.period.id }), NO_PERIOD, 409);
  expect(await bonusOf(other.period)).toBe(0);
});
