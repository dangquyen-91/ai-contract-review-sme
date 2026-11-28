// Unit test cases for SUB-04 cancelDowngrade (UTCID01–UTCID10 in the test-case sheet).
const {
  DAY, start, stop, call, errorOf, account, business, personal, addPeriod, schedule, scheduledOf, openOrder,
} = require('./helpers/billing');

const cancel = (space, user = space.owner) => call('delete', `/organizations/${space.id}/subscription/downgrade`, user);
async function scheduledCompany() {
  const space = await business();
  const period = await addPeriod(space, 'business_pro', { from: -25, to: 5 });
  await schedule(space, 'business_starter', period.endsAt);
  return space;
}
async function expectKept(space, response, status, message) {
  expect(response.status).toBe(status);
  expect(errorOf(response)).toBe(message);
  expect(await scheduledOf(space)).toMatchObject({ planCode: 'business_starter' });
}

beforeAll(start);
afterAll(stop);

test('UTCID01: the Owner cancels the scheduled downgrade', async () => {
  const space = await scheduledCompany();
  expect((await cancel(space)).status).toBe(204);
  expect(await scheduledOf(space)).toBeUndefined();
});

test('UTCID02: a personal account cancels its scheduled downgrade', async () => {
  const space = await personal();
  const period = await addPeriod(space, 'personal_pro');
  await schedule(space, 'personal_free', period.endsAt);
  expect((await cancel(space)).status).toBe(204);
  expect(await scheduledOf(space)).toBeUndefined();
});

test('UTCID03: a schedule 2 days past its date can still be cancelled', async () => {
  const space = await business();
  await addPeriod(space, 'business_pro', { from: -32, to: -2 });
  await schedule(space, 'business_starter', new Date(Date.now() - 2 * DAY));
  expect((await cancel(space)).status).toBe(204);
  expect(await scheduledOf(space)).toBeUndefined();
});

test('UTCID04: a schedule 3 days past its date has lapsed, so there is nothing to cancel', async () => {
  const space = await business();
  await addPeriod(space, 'business_pro', { from: -33, to: -3 });
  await schedule(space, 'business_starter', new Date(Date.now() - 3 * DAY));
  const response = await cancel(space);
  expect(response.status).toBe(404);
  expect(errorOf(response)).toBe('Chưa có lịch hạ gói.');
});

test('UTCID05: without a schedule there is nothing to cancel', async () => {
  const space = await business();
  await addPeriod(space, 'business_pro');
  const response = await cancel(space);
  expect(response.status).toBe(404);
  expect(errorOf(response)).toBe('Chưa có lịch hạ gói.');
});

test('UTCID06: an open plan order blocks the cancellation', async () => {
  const space = await scheduledCompany();
  await openOrder(space, { planCode: 'business_starter', amount: 499000 });
  const response = await cancel(space);
  await expectKept(space, response, 409,
    'Đang có đơn thanh toán gói chưa hoàn tất. Vui lòng hoàn tất hoặc hủy đơn đó trước khi thay đổi lịch hạ gói.');
  expect(response.body.error.code).toBe('PLAN_PAYMENT_IN_PROGRESS');
});

test('UTCID07: a downgrade that is already paid cannot be cancelled', async () => {
  const space = await scheduledCompany();
  await addPeriod(space, 'business_starter', { from: 5.001, to: 35 });
  await expectKept(space, await cancel(space), 409, 'Kỳ hạ gói đã được thanh toán nên không thể hủy tại đây.');
});

test('UTCID08: Staff cannot cancel', async () => {
  const space = await scheduledCompany();
  const staff = await account('staff', space.company._id);
  await expectKept(space, await cancel(space, staff), 403,
    'Chỉ chủ tổ chức hoặc chủ tài khoản cá nhân được quản lý gói dịch vụ.');
});

test('UTCID09: the Owner of another organization cannot cancel', async () => {
  const space = await scheduledCompany();
  const other = await business('Công ty khác');
  await expectKept(space, await cancel(space, other.owner), 403,
    'Bạn không thuộc tổ chức này hoặc tài khoản đã bị vô hiệu hóa.');
});

test('UTCID10: a request without a token is rejected', async () => {
  const space = await scheduledCompany();
  await expectKept(space, await cancel(space, null), 401, 'Missing bearer token');
});
