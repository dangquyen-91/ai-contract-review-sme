// Unit test cases for SUB-03 scheduleDowngrade (UTCID01–UTCID15 in the test-case sheet).
const {
  start, stop, call, errorOf, account, business, personal, addStaff, addPeriod, schedule, scheduledOf, openOrder,
} = require('./helpers/billing');

const post = (space, planCode, user = space.owner) =>
  call('post', `/organizations/${space.id}/subscription/downgrade`, user, { planCode });
const INVALID = 'Vui lòng chọn gói thấp hơn, cùng loại cá nhân hoặc doanh nghiệp, khi gói trả phí hiện tại còn hiệu lực.';
async function proCompany(options) {
  const space = await business();
  return { space, period: await addPeriod(space, 'business_pro', options) };
}
async function expectRejected(space, response, status, message) {
  expect(response.status).toBe(status);
  expect(errorOf(response)).toBe(message);
  expect(await scheduledOf(space)).toBeUndefined();
}

beforeAll(start);
afterAll(stop);

test('UTCID01: the Owner schedules a lower plan at the end of the current period', async () => {
  const { space, period } = await proCompany();
  const response = await post(space, 'business_starter');
  expect(response.status).toBe(200);
  expect(response.body.data).toEqual({ planCode: 'business_starter', effectiveAt: period.endsAt.toISOString() });
  expect(await scheduledOf(space)).toMatchObject({ planCode: 'business_starter', effectiveAt: period.endsAt });
});

test('UTCID02: a personal account schedules Personal Free', async () => {
  const space = await personal();
  const period = await addPeriod(space, 'personal_pro');
  const response = await post(space, 'personal_free');
  expect(response.status).toBe(200);
  expect(response.body.data.effectiveAt).toBe(period.endsAt.toISOString());
});

test('UTCID03: with a period paid ahead, the downgrade starts after that period', async () => {
  const { space } = await proCompany({ from: -25, to: 5 });
  const next = await addPeriod(space, 'business_pro', { from: 5, to: 35 });
  const response = await post(space, 'business_starter');
  expect(response.status).toBe(200);
  expect(response.body.data.effectiveAt).toBe(next.endsAt.toISOString());
});

test('UTCID04: exactly 5 members fit the 5-seat plan', async () => {
  const { space } = await proCompany();
  await addStaff(space, 4);
  expect((await post(space, 'business_starter')).status).toBe(200);
});

test('UTCID05: 6 members do not fit the 5-seat plan', async () => {
  const { space } = await proCompany();
  await addStaff(space, 5);
  await expectRejected(space, await post(space, 'business_starter'), 409,
    'Vui lòng giảm số thành viên cho phù hợp với gói mới trước khi lên lịch hạ gói.');
});

test('UTCID06: a higher plan is rejected', async () => {
  const space = await business();
  await addPeriod(space, 'business_starter');
  await expectRejected(space, await post(space, 'business_pro'), 400, INVALID);
});

test('UTCID07: the current plan is rejected', async () => {
  const { space } = await proCompany();
  await expectRejected(space, await post(space, 'business_pro'), 400, INVALID);
});

test('UTCID08: a personal plan is rejected for an organization', async () => {
  const { space } = await proCompany();
  await expectRejected(space, await post(space, 'personal_pro'), 400, INVALID);
});

test('UTCID09: an organization without a paid plan is rejected', async () => {
  const space = await business();
  await expectRejected(space, await post(space, 'business_starter'), 400, INVALID);
});

test('UTCID10: an open plan order blocks the schedule', async () => {
  const { space } = await proCompany();
  await openOrder(space);
  const response = await post(space, 'business_starter');
  await expectRejected(space, response, 409,
    'Đang có đơn thanh toán gói chưa hoàn tất. Vui lòng hoàn tất hoặc hủy đơn đó trước khi thay đổi lịch hạ gói.');
  expect(response.body.error.code).toBe('PLAN_PAYMENT_IN_PROGRESS');
});

test('UTCID11: a downgrade that is already paid cannot be replaced', async () => {
  const { space, period } = await proCompany({ from: -25, to: 5 });
  await schedule(space, 'business_starter', period.endsAt);
  await addPeriod(space, 'business_starter', { from: 5.001, to: 35 });
  const response = await post(space, 'business_starter');
  expect(response.status).toBe(409);
  expect(errorOf(response)).toBe('Lịch hạ gói đã được thanh toán nên không thể thay thế.');
  expect(await scheduledOf(space)).toMatchObject({ effectiveAt: period.endsAt });
});

test('UTCID12: an unknown plan code is rejected', async () => {
  const { space } = await proCompany();
  const response = await post(space, 'gold');
  expect(response.status).toBe(400);
  expect(errorOf(response)).toMatch(/^Invalid enum value/);
  expect(await scheduledOf(space)).toBeUndefined();
});

test('UTCID13: Staff cannot schedule a downgrade', async () => {
  const { space } = await proCompany();
  const staff = await account('staff', space.company._id);
  await expectRejected(space, await post(space, 'business_starter', staff), 403,
    'Chỉ chủ tổ chức hoặc chủ tài khoản cá nhân được quản lý gói dịch vụ.');
});

test('UTCID14: the Owner cannot act on another organization', async () => {
  const { space } = await proCompany();
  const other = await business('Công ty khác');
  await expectRejected(space, await post(space, 'business_starter', other.owner), 403,
    'Bạn không thuộc tổ chức này hoặc tài khoản đã bị vô hiệu hóa.');
});

test('UTCID15: a request without a token is rejected', async () => {
  const { space } = await proCompany();
  await expectRejected(space, await post(space, 'business_starter', null), 401, 'Missing bearer token');
});
