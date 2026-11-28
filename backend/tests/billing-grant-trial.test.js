// Unit test cases for SUB-06 grantBusinessTrial (UTCID01–UTCID06 in the test-case sheet).
const { DAY, start, stop, mongoose, account, business, SubscriptionPeriodModel } = require('./helpers/billing');
const { grantBusinessTrial } = require('../dist/services/billing/subscription.service');

const grant = (space, owner, now = new Date()) =>
  mongoose.connection.transaction((session) => grantBusinessTrial(space.id, owner.id, session, now));
const trials = (owner) => SubscriptionPeriodModel.find({ key: `trial:${owner.id}` }).lean();

beforeAll(start);
afterAll(stop);

test('UTCID01: a first organization receives a 7-day trial with 5 reviews, 30 chats and 5 drafts', async () => {
  const space = await business();
  const now = new Date();
  expect(await grant(space, space.owner, now)).toBe(true);
  const [trial] = await trials(space.owner);
  expect(String(trial.orgId)).toBe(space.id);
  expect(trial.plan).toMatchObject({ code: 'business_trial', price: 0, analysisLimit: 5, chatLimit: 30, draftingLimit: 5, memberLimit: 3 });
  expect(trial.startsAt).toEqual(now);
  expect(trial.endsAt - trial.startsAt).toBe(7 * DAY);
});

test('UTCID02: different owners each receive their own trial', async () => {
  const [first, second] = [await business(), await business('Công ty khác')];
  expect(await grant(first, first.owner)).toBe(true);
  expect(await grant(second, second.owner)).toBe(true);
  expect(await trials(first.owner)).toHaveLength(1);
  expect(await trials(second.owner)).toHaveLength(1);
});

test('UTCID03: a second organization of the same owner receives no trial', async () => {
  const [first, second] = [await business(), await business('Công ty mới')];
  expect(await grant(first, first.owner)).toBe(true);
  expect(await grant(second, first.owner)).toBe(false);
  const all = await trials(first.owner);
  expect(all).toHaveLength(1);
  expect(String(all[0].orgId)).toBe(first.id);
});

test('UTCID04: a trial that ended long ago is not granted again', async () => {
  const space = await business();
  expect(await grant(space, space.owner, new Date(Date.now() - 100 * DAY))).toBe(true);
  expect(await grant(space, space.owner)).toBe(false);
  expect(await trials(space.owner)).toHaveLength(1);
});

test('UTCID05: nothing is kept when the surrounding transaction fails', async () => {
  const space = await business();
  await expect(
    mongoose.connection.transaction(async (session) => {
      await grantBusinessTrial(space.id, space.owner.id, session);
      throw new Error('organization creation failed');
    }),
  ).rejects.toThrow('organization creation failed');
  expect(await trials(space.owner)).toHaveLength(0);
});

test('UTCID06: two simultaneous requests grant only one trial', async () => {
  const owner = await account();
  const [first, second] = [await business(), await business('Công ty khác')];
  await Promise.allSettled([grant(first, owner), grant(second, owner)]);
  expect(await trials(owner)).toHaveLength(1);
});
