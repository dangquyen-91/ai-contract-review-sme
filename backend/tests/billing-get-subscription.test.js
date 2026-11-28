// Unit test cases for SUB-02 getSubscription (UTCID01–UTCID14 in the test-case sheet).
const {
  start, stop, call, errorOf, account, business, personal, addPeriod, schedule, seedInvitation,
} = require('./helpers/billing');

const get = (id, user) => call('get', `/organizations/${id}/subscription`, user);
const read = async (space) => {
  const response = await get(space.id, space.owner);
  expect(response.status).toBe(200);
  return response.body.data;
};

beforeAll(start);
afterAll(stop);

test('UTCID01: a personal account without a paid plan is on Personal Free', async () => {
  expect(await read(await personal())).toMatchObject({
    status: 'active',
    plan: { code: 'personal_free' },
    trial: null,
    renewal: { status: 'none' },
    analysis: { limit: 3, available: 3 },
    chat: { limit: 10 },
    members: { count: 1, limit: 1, available: 0 },
    contractReviewPricing: { unitPrice: 10000, pagesPerUnit: 5 },
  });
});

test('UTCID02: an organization that never paid is unsubscribed with three seats', async () => {
  const data = await read(await business());
  expect(data).toMatchObject({
    status: 'unsubscribed',
    plan: null,
    periodId: null,
    analysis: { limit: 0, available: 0 },
    members: { count: 1, pending: 0, limit: 3, available: 2 },
  });
  expect(data).not.toHaveProperty('contractReviewPricing');
});

test('UTCID03: an organization in its trial shows the trial period', async () => {
  const space = await business();
  await addPeriod(space, 'business_trial', { from: -2, to: 5 });
  expect(await read(space)).toMatchObject({
    status: 'active', plan: { code: 'business_trial' }, trial: { endingSoon: false }, analysis: { limit: 5 },
  });
});

test('UTCID04: a trial with 3 days left is marked as ending soon', async () => {
  const space = await business();
  await addPeriod(space, 'business_trial', { from: -4, to: 3 });
  expect((await read(space)).trial.endingSoon).toBe(true);
});

test('UTCID05: a paid plan shows purchased units, usage and reserved seats', async () => {
  const space = await business();
  await addPeriod(space, 'business_starter', { analysisBonus: 50, analysisUsed: 10, analysisReserved: 2 });
  await seedInvitation(space.company, space.owner);
  expect(await read(space)).toMatchObject({
    status: 'active',
    plan: { code: 'business_starter' },
    renewal: { status: 'not_open' },
    analysis: { planLimit: 200, bonus: 50, limit: 250, used: 10, reserved: 2, available: 238 },
    members: { count: 1, pending: 1, limit: 5, available: 3 },
  });
});

test('UTCID06: a scheduled downgrade is shown and limits the seats', async () => {
  const space = await business();
  const period = await addPeriod(space, 'business_pro');
  await schedule(space, 'business_starter', period.endsAt);
  expect(await read(space)).toMatchObject({
    plan: { code: 'business_pro' },
    scheduledDowngrade: { planCode: 'business_starter' },
    renewal: { planCode: 'business_starter', payable: true },
    members: { limit: 5 },
  });
});

test('UTCID07: a period paid ahead is shown as renewed', async () => {
  const space = await business();
  await addPeriod(space, 'business_starter', { from: -25, to: 5 });
  await addPeriod(space, 'business_starter', { from: 5, to: 35 });
  const data = await read(space);
  expect(data.renewal.status).toBe('renewed');
  expect(data.futurePeriods).toHaveLength(1);
});

test('UTCID08: renewal is open during the last 7 days', async () => {
  const space = await business();
  await addPeriod(space, 'business_starter', { from: -23, to: 7 });
  expect((await read(space)).renewal).toMatchObject({ status: 'open', planCode: 'business_starter', payable: true });
});

test('UTCID09: a plan that ended 2 days ago is in the grace period', async () => {
  const space = await business();
  await addPeriod(space, 'business_starter', { from: -32, to: -2 });
  expect(await read(space)).toMatchObject({ status: 'expired', plan: null, renewal: { status: 'grace' } });
});

test('UTCID10: a plan that ended 4 days ago is expired and can no longer be renewed', async () => {
  const space = await business();
  await addPeriod(space, 'business_starter', { from: -34, to: -4 });
  expect(await read(space)).toMatchObject({ status: 'expired', plan: null, renewal: { status: 'none' }, analysis: { available: 0 } });
});

test('UTCID11: Staff can read the subscription of their organization', async () => {
  const space = await business();
  const staff = await account('staff', space.company._id);
  const response = await get(space.id, staff);
  expect(response.status).toBe(200);
  expect(response.body.data.orgId).toBe(space.id);
});

test('UTCID12: the subscription of another organization is forbidden', async () => {
  const [mine, other] = [await business(), await business('Công ty khác')];
  const response = await get(other.id, mine.owner);
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Bạn không thuộc tổ chức này hoặc tài khoản đã bị vô hiệu hóa.');
  expect(response.body.data).toBeUndefined();
});

test('UTCID13: an invalid organization ID is rejected', async () => {
  const response = await get('abc', (await business()).owner);
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Invalid organization id');
});

test('UTCID14: a request without a token is rejected', async () => {
  const response = await get((await business()).id);
  expect(response.status).toBe(401);
  expect(errorOf(response)).toBe('Missing bearer token');
});
