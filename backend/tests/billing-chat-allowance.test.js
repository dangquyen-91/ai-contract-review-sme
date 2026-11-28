// Unit test cases for SUB-12 contractChatAllowance (UTCID01–UTCID08 in the test-case sheet).
const { start, stop, missingId, personal, addVersion, contractOf, addPurchase } = require('./helpers/billing');
const { contractChatAllowance } = require('../dist/services/billing/contractReviewPurchase.service');

async function setup() {
  const space = await personal();
  return { space, ...(await contractOf(space)) };
}
const allowance = ({ space, contract }) => contractChatAllowance(space.id, space.owner.id, contract.id);
const NONE = { allowance: 0, used: 0, reserved: 0, available: 0 };

beforeAll(start);
afterAll(stop);

test('UTCID01: a contract without a paid review has no included chat', async () => {
  expect(await allowance(await setup())).toEqual(NONE);
});

test('UTCID02: used and reserved questions are subtracted', async () => {
  const s = await setup();
  await addPurchase(s.space, s.contract, s.version._id, { chatUsed: 5, chatReserved: 1 });
  expect(await allowance(s)).toEqual({ allowance: 20, used: 5, reserved: 1, available: 14 });
});

test('UTCID03: the purchases of every version are added together', async () => {
  const s = await setup();
  await addPurchase(s.space, s.contract, s.version._id, { chatUsed: 20 });
  await addPurchase(s.space, s.contract, (await addVersion(s.contract, 8, 2))._id, { chatUsed: 2 });
  expect(await allowance(s)).toEqual({ allowance: 40, used: 22, reserved: 0, available: 18 });
});

test('UTCID04: a purchase sold without included chat counts as zero', async () => {
  const s = await setup();
  await addPurchase(s.space, s.contract, s.version._id, { chatAllowance: undefined });
  expect(await allowance(s)).toEqual(NONE);
});

test('UTCID05: one question is left after 19 of 20', async () => {
  const s = await setup();
  await addPurchase(s.space, s.contract, s.version._id, { chatUsed: 18, chatReserved: 1 });
  expect((await allowance(s)).available).toBe(1);
});

test('UTCID06: no question is left after 20 of 20', async () => {
  const s = await setup();
  await addPurchase(s.space, s.contract, s.version._id, { chatUsed: 20 });
  expect((await allowance(s)).available).toBe(0);
});

test('UTCID07: purchases of another contract are not counted', async () => {
  const s = await setup();
  const other = await contractOf(s.space);
  await addPurchase(s.space, other.contract, other.version._id);
  expect(await allowance(s)).toEqual(NONE);
});

test('UTCID08: another user does not see the included chat', async () => {
  const s = await setup();
  await addPurchase(s.space, s.contract, s.version._id);
  expect(await contractChatAllowance(s.space.id, missingId(), s.contract.id)).toEqual(NONE);
});
