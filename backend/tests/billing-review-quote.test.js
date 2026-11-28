// Unit test cases for SUB-10 contractReviewQuote (UTCID01–UTCID15 in the test-case sheet).
const {
  start, stop, business, personal, addContract, addVersion, contractOf, addPurchase, openOrder, expectError,
  SubscriptionPeriodModel,
} = require('./helpers/billing');
const { contractReviewQuote } = require('../dist/services/billing/contractReviewPurchase.service');
const { getSubscription } = require('../dist/services/billing/subscription.service');

const quote = (space, contract) => contractReviewQuote(space.owner.id, space.id, contract.id);
/** A personal account that already used `used` of its 3 free review units. */
async function user(used) {
  const space = await personal();
  const { periodId } = await getSubscription(space.id, space.id);
  await SubscriptionPeriodModel.updateOne({ _id: periodId }, { $set: { analysisUsed: used } });
  return space;
}
async function review(used, pages) {
  const space = await user(used);
  return { space, ...(await contractOf(space, pages)) };
}

beforeAll(start);
afterAll(stop);

test('UTCID01: enough free units means nothing to pay', async () => {
  const { space, contract, version } = await review(0, 8);
  expect(await quote(space, contract)).toMatchObject({
    versionId: version.id, pageCount: 8, units: 2, paidUnits: 0, planUnits: 2, shortfallUnits: 0, amount: 0, canPurchase: false,
  });
});

test('UTCID02: without free units every unit is paid', async () => {
  const { space, contract } = await review(3, 8);
  expect(await quote(space, contract)).toMatchObject({
    units: 2, planUnits: 0, shortfallUnits: 2, unitPrice: 10000, amount: 20000, currency: 'VND', canPurchase: true, includedChat: 20,
  });
});

test('UTCID03: the remaining free unit is used first and only the rest is paid', async () => {
  const { space, contract } = await review(2, 8);
  expect(await quote(space, contract)).toMatchObject({ planUnits: 1, shortfallUnits: 1, amount: 10000, canPurchase: true });
});

test('UTCID04: 5 pages cost one unit', async () => {
  const { space, contract } = await review(3, 5);
  expect(await quote(space, contract)).toMatchObject({ pageCount: 5, units: 1, amount: 10000 });
});

test('UTCID05: 6 pages cost two units', async () => {
  const { space, contract } = await review(3, 6);
  expect(await quote(space, contract)).toMatchObject({ pageCount: 6, units: 2, amount: 20000 });
});

test('UTCID06: an unused purchase of this version covers the review', async () => {
  const { space, contract, version } = await review(3, 8);
  const purchase = await addPurchase(space, contract, version._id);
  expect(await quote(space, contract)).toMatchObject({
    paidUnits: 2, shortfallUnits: 0, amount: 0, canPurchase: false, purchaseStatus: 'available',
    carryPurchaseId: purchase.id, contractChat: { allowance: 20, available: 20 },
  });
});

test('UTCID07: an unused purchase of an earlier version is carried and only the extra unit is paid', async () => {
  const { space, contract, version } = await review(3, 8);
  const purchase = await addPurchase(space, contract, version._id);
  await addVersion(contract, 13, 2);
  expect(await quote(space, contract)).toMatchObject({
    units: 3, paidUnits: 2, shortfallUnits: 1, amount: 10000, canPurchase: true, carryPurchaseId: purchase.id,
  });
});

test('UTCID08: a purchase that was already used cannot be bought again for the same version', async () => {
  const { space, contract, version } = await review(3, 8);
  await addPurchase(space, contract, version._id, { status: 'consumed' });
  expect(await quote(space, contract)).toMatchObject({ paidUnits: 0, canPurchase: false, purchaseStatus: 'consumed' });
});

test('UTCID09: an unconfirmed open order is reported as blocking', async () => {
  const { space, contract } = await review(3, 8);
  const order = await openOrder(space, { planCode: 'personal_pro', amount: 99000 });
  expect(await quote(space, contract)).toMatchObject({ openOrderCode: order.orderCode, replacesOrderCode: null });
});

test('UTCID10: an organization member is rejected', async () => {
  const space = await business();
  const { contract } = await contractOf(space);
  await expectError(quote(space, contract), 'Thanh toán từng hợp đồng chỉ dành cho tài khoản cá nhân.', 403);
});

test('UTCID11: the contract of another account is not found', async () => {
  const [space, other] = [await user(3), await user(3)];
  const { contract } = await contractOf(other);
  await expectError(quote(space, contract), 'Không tìm thấy hợp đồng.', 404);
});

test('UTCID12: a contract whose type is not confirmed is rejected', async () => {
  const space = await user(3);
  const contract = await addContract(space, { type: undefined, ourParty: undefined });
  await addVersion(contract, 8);
  await expectError(quote(space, contract), 'Hãy xác nhận loại hợp đồng trước khi thanh toán.', 409);
});

test('UTCID13: a contract type that personal accounts cannot review is rejected', async () => {
  const space = await user(3);
  const contract = await addContract(space, { type: 'sales' });
  await addVersion(contract, 8);
  await expectError(quote(space, contract),
    'Personal accounts can only review insurance, housing purchase, and labor contracts', 400);
});

test('UTCID14: a contract without a version is rejected', async () => {
  const space = await user(3);
  await expectError(quote(space, await addContract(space)), 'Không tìm thấy phiên bản hợp đồng.', 404);
});

test('UTCID15: an unknown page count is rejected', async () => {
  const space = await user(3);
  const contract = await addContract(space);
  await addVersion(contract, 8, 1, { extractionStatus: 'processing' });
  await expectError(quote(space, contract),
    'Chưa xác định được số trang hợp lệ. Chờ đọc tệp hoàn tất hoặc tải lại dưới dạng PDF; chưa trừ lượt.',
    409, 'REVIEW_PAGE_COUNT_UNAVAILABLE');
});
