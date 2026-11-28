// Unit test cases for SUB-07 activatePaidSubscription (UTCID01–UTCID15 in the test-case sheet).
const {
  DAY, start, stop, nextNumber, business, addStaff, addPeriod, periodById, schedule, scheduledOf, expectError,
  SubscriptionPeriodModel,
} = require('./helpers/billing');
const { activatePaidSubscription } = require('../dist/services/billing/subscription.service');
const { addSubscriptionMonth } = require('../dist/utils/subscriptionPeriods');

const SECOND = 1000 / DAY; // in days
const now = new Date();
const PRICE = { business_starter: 499000, business_pro: 999000 };
const activate = (space, planCode, action, fields = {}) =>
  activatePaidSubscription(
    { orgId: space.id, planCode, action, amount: PRICE[planCode], paymentReference: `ref-${nextNumber()}`, ...fields },
    now,
  );
async function company(planCode, from, to, fields = {}) {
  const space = await business();
  return { space, current: await addPeriod(space, planCode, { from, to, now, ...fields }) };
}
const countOf = (space) => SubscriptionPeriodModel.countDocuments({ orgId: space.id });

beforeAll(start);
afterAll(stop);

test('UTCID01: a purchase starts now and lasts one month', async () => {
  const space = await business();
  const period = await activate(space, 'business_starter', 'purchase');
  expect(period).toMatchObject({ paymentAction: 'purchase', paidAmount: 499000, startsAt: now, endsAt: addSubscriptionMonth(now) });
  expect(period.plan.code).toBe('business_starter');
});

test('UTCID02: a renewal starts when the current period ends and keeps its usage', async () => {
  const { space, current } = await company('business_starter', -25, 5, { analysisUsed: 10 });
  const period = await activate(space, 'business_starter', 'renew');
  expect(period.startsAt).toEqual(current.endsAt);
  expect(period.analysisUsed).toBe(0);
  expect((await periodById(current)).analysisUsed).toBe(10);
});

test('UTCID03: a renewal within the 3-day grace period starts now', async () => {
  const { space } = await company('business_starter', -32, -2);
  expect((await activate(space, 'business_starter', 'renew')).startsAt).toEqual(now);
});

test('UTCID04: an upgrade starts now, closes the old period, keeps unused purchased units and clears the schedule', async () => {
  const { space, current } = await company('business_starter', -15, 15, { analysisBonus: 50 });
  await schedule(space, 'business_starter', current.endsAt);
  const period = await activate(space, 'business_pro', 'upgrade', { amount: 749500 });
  expect(period).toMatchObject({ startsAt: now, paidAmount: 749500, analysisBonus: 50 });
  expect((await periodById(current)).cancelledAt).toEqual(now);
  expect(await scheduledOf(space)).toBeUndefined();
});

test('UTCID05: a scheduled lower plan is paid as the next period', async () => {
  const { space, current } = await company('business_pro', -25, 5);
  await schedule(space, 'business_starter', current.endsAt);
  const period = await activate(space, 'business_starter', 'renew');
  expect(period.plan.code).toBe('business_starter');
  expect(period.startsAt).toEqual(current.endsAt);
});

test('UTCID06: the same payment activated twice creates one period', async () => {
  const space = await business();
  const first = await activate(space, 'business_starter', 'purchase', { paymentReference: 'ref-twice' });
  const second = await activate(space, 'business_starter', 'purchase', { paymentReference: 'ref-twice' });
  expect(second.id).toBe(first.id);
  expect(await countOf(space)).toBe(1);
});

test('UTCID07: a renewal exactly 7 days before the end is accepted', async () => {
  const { space, current } = await company('business_starter', -23, 7);
  expect((await activate(space, 'business_starter', 'renew')).startsAt).toEqual(current.endsAt);
});

test('UTCID08: a renewal 7 days and 1 second before the end is rejected', async () => {
  const { space } = await company('business_starter', -23, 7 + SECOND);
  await expectError(activate(space, 'business_starter', 'renew'), expect.stringMatching(/^Có thể gia hạn từ /), 409, 'RENEWAL_NOT_OPEN');
  expect(await countOf(space)).toBe(1);
});

test('UTCID09: a wrong amount is rejected', async () => {
  const space = await business();
  await expectError(activate(space, 'business_starter', 'purchase', { amount: 498999 }),
    'Số tiền thanh toán hoặc gói dịch vụ không phù hợp với tài khoản này.', 400, 'PLAN_AMOUNT_MISMATCH');
  expect(await countOf(space)).toBe(0);
});

test('UTCID10: a payment reference of another transaction is rejected', async () => {
  const [space, other] = [await business(), await business('Công ty khác')];
  await activate(space, 'business_starter', 'purchase', { paymentReference: 'ref-reused' });
  await expectError(activate(other, 'business_starter', 'purchase', { paymentReference: 'ref-reused' }),
    'Mã tham chiếu thanh toán đã được dùng cho giao dịch khác.', 409);
  expect(await countOf(other)).toBe(0);
});

test('UTCID11: a purchase while a plan is active is rejected', async () => {
  const { space } = await company('business_starter', -15, 15);
  await expectError(activate(space, 'business_starter', 'purchase'),
    'Đã có gói đang hoạt động hoặc kỳ gói đã thanh toán trước.', 409);
  expect(await countOf(space)).toBe(1);
});

test('UTCID12: an upgrade to a lower plan is rejected', async () => {
  const { space, current } = await company('business_pro', -15, 15);
  await expectError(activate(space, 'business_starter', 'upgrade'), 'Gói được chọn không phải là gói nâng cấp.', 409);
  expect((await periodById(current)).cancelledAt).toBeUndefined();
});

test('UTCID13: a renewal with a plan that was not chosen is rejected', async () => {
  const { space } = await company('business_pro', -25, 5);
  await expectError(activate(space, 'business_starter', 'renew'),
    'Chỉ có thể gia hạn gói đang dùng hoặc vừa hết hạn trong 3 ngày.', 409, 'RENEWAL_PLAN_MISMATCH');
  expect(await countOf(space)).toBe(1);
});

test('UTCID14: a next period that is already paid cannot be paid again', async () => {
  const { space } = await company('business_starter', -25, 5);
  await activate(space, 'business_starter', 'renew');
  await expectError(activate(space, 'business_starter', 'renew'), 'Kỳ tiếp theo đã được thanh toán.', 409, 'ALREADY_RENEWED');
  expect(await countOf(space)).toBe(2);
});

test('UTCID15: too many members for the plan is rejected', async () => {
  const space = await business();
  await addStaff(space, 5);
  await expectError(activate(space, 'business_starter', 'purchase'),
    'Số thành viên hiện tại vượt giới hạn của gói được chọn.', 409);
  expect(await countOf(space)).toBe(0);
});
