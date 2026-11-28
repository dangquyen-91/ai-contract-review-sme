// Unit test cases for SUB-01 listPlans (UTCID01–UTCID03 in the test-case sheet).
const { start, stop, call, PlanModel } = require('./helpers/billing');

const list = () => call('get', '/plans');

beforeAll(start);
afterAll(stop);

test('UTCID01: the four plans are listed from the cheapest, without signing in and without the trial', async () => {
  const response = await list();
  expect(response.status).toBe(200);
  expect(response.body.data.map(({ code, price }) => [code, price])).toEqual([
    ['personal_free', 0],
    ['personal_pro', 99000],
    ['business_starter', 499000],
    ['business_pro', 999000],
  ]);
  for (const plan of response.body.data) expect(plan).not.toHaveProperty('__v');
});

test('UTCID02: the order follows a price changed in the database', async () => {
  await PlanModel.updateOne({ code: 'personal_pro' }, { $set: { price: 600000 } });
  const response = await list();
  expect(response.status).toBe(200);
  expect(response.body.data.map((plan) => plan.code)).toEqual([
    'personal_free', 'business_starter', 'personal_pro', 'business_pro',
  ]);
});

test('UTCID03: an empty catalog returns an empty list', async () => {
  await PlanModel.deleteMany({});
  const response = await list();
  expect(response.status).toBe(200);
  expect(response.body.data).toEqual([]);
});
