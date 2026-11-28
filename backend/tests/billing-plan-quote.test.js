// Unit test cases for SUB-05 quotePlanCheckout (UTCID01–UTCID15 in the test-case sheet).
const {
  DAY, start, stop, call, errorOf, account, business, addStaff, addPeriod, schedule, expectError,
} = require('./helpers/billing');
const { quotePlanCheckout } = require('../dist/services/billing/subscription.service');

const SECOND = 1000 / DAY; // in days
const now = new Date();
const quote = (space, planCode, userId = space.owner.id) => quotePlanCheckout(userId, space.id, planCode, now);
async function company(planCode, from, to, fields = {}) {
  const space = await business();
  await addPeriod(space, planCode, { from, to, now, ...fields });
  return space;
}
const free = { blockReason: null, blockCode: null };

beforeAll(start);
afterAll(stop);

test('UTCID01: without a plan it is a purchase at the list price', async () => {
  expect(await quote(await business(), 'business_starter')).toMatchObject({
    action: 'purchase', needsSchedule: false, listPrice: 499000, credit: 0, amount: 499000, ...free,
  });
});

test('UTCID02: an upgrade halfway through the period is credited half of the paid price', async () => {
  const space = await company('business_starter', -15, 15);
  expect(await quote(space, 'business_pro')).toMatchObject({
    action: 'upgrade', listPrice: 999000, credit: 249500, amount: 749500, ...free,
  });
});

test('UTCID03: a credit above the price is charged the minimum of 2,000 VND', async () => {
  const space = await company('business_starter', -15, 15, { paidAmount: 5000000 });
  expect(await quote(space, 'business_pro')).toMatchObject({ action: 'upgrade', credit: 2500000, amount: 2000, ...free });
});

test('UTCID04: exactly 7 days before the end the plan can be renewed', async () => {
  const space = await company('business_starter', -23, 7);
  expect(await quote(space, 'business_starter')).toMatchObject({ action: 'renew', amount: 499000, ...free });
});

test('UTCID05: 7 days and 1 second before the end the renewal is not open yet', async () => {
  const space = await company('business_starter', -23, 7 + SECOND);
  const result = await quote(space, 'business_starter');
  expect(result).toMatchObject({ action: 'renew', blockCode: 'RENEWAL_NOT_OPEN', blockStatus: 409 });
  expect(result.blockReason).toMatch(/^Có thể gia hạn từ /);
});

test('UTCID06: 1 second before the 3-day grace period ends it is still a renewal', async () => {
  const space = await company('business_starter', -33, -3 + SECOND);
  expect(await quote(space, 'business_starter')).toMatchObject({ action: 'renew', amount: 499000, ...free });
});

test('UTCID07: exactly 3 days after the end it is a new purchase', async () => {
  const space = await company('business_starter', -33, -3);
  expect(await quote(space, 'business_starter')).toMatchObject({ action: 'purchase', amount: 499000, ...free });
});

test('UTCID08: a lower plan has to be scheduled and has no amount', async () => {
  const space = await company('business_pro', -15, 15);
  expect(await quote(space, 'business_starter')).toMatchObject({ action: 'downgrade', needsSchedule: true, amount: null, ...free });
});

test('UTCID09: a scheduled lower plan is paid as the renewal at its own price', async () => {
  const space = await company('business_pro', -25, 5);
  await schedule(space, 'business_starter', new Date(now.getTime() + 5 * DAY));
  expect(await quote(space, 'business_starter')).toMatchObject({ action: 'renew', needsSchedule: false, amount: 499000, ...free });
});

test('UTCID10: a next period that is already paid blocks another renewal', async () => {
  const space = await company('business_starter', -25, 5);
  await addPeriod(space, 'business_starter', { from: 5, to: 35, now });
  expect(await quote(space, 'business_starter')).toMatchObject({
    action: 'renew', blockCode: 'ALREADY_RENEWED', blockReason: 'Kỳ tiếp theo đã được thanh toán.',
  });
});

test('UTCID11: too many members for the plan blocks the purchase', async () => {
  const space = await business();
  await addStaff(space, 5);
  expect(await quote(space, 'business_starter')).toMatchObject({
    action: 'purchase', blockReason: 'Số thành viên hiện tại vượt giới hạn của gói được chọn.',
  });
});

test('UTCID12: a personal plan is blocked for an organization', async () => {
  expect(await quote(await business(), 'personal_pro')).toMatchObject({
    blockReason: 'Số tiền thanh toán hoặc gói dịch vụ không phù hợp với tài khoản này.', blockStatus: 400,
  });
});

test('UTCID13: a plan that is not in the catalog is not found', async () => {
  await expectError(quote(await business(), 'business_trial'), 'Không tìm thấy gói dịch vụ.', 404);
});

test('UTCID14: Staff cannot get a quote', async () => {
  const space = await business();
  const staff = await account('staff', space.company._id);
  await expectError(quote(space, 'business_starter', staff.id),
    'Chỉ chủ tổ chức hoặc chủ tài khoản cá nhân được quản lý gói dịch vụ.', 403);
});

test('UTCID15: a request without a token is rejected', async () => {
  const space = await business();
  const response = await call('get', `/organizations/${space.id}/subscription/quote?planCode=business_starter`);
  expect(response.status).toBe(401);
  expect(errorOf(response)).toBe('Missing bearer token');
});
