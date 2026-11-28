// Unit test cases for SUB-11 activateContractReviewPurchase (UTCID01–UTCID11 in the test-case sheet).
const {
  start, stop, missingId, nextNumber, personal, addVersion, contractOf, addPurchase, purchaseById, expectError,
  ContractReviewPurchaseModel, PaymentModel,
} = require('./helpers/billing');
const { activateContractReviewPurchase } = require('../dist/services/billing/contractReviewPurchase.service');

async function setup() {
  const space = await personal();
  return { space, ...(await contractOf(space)) };
}
/** A paid order for the 8-page version (2 units). */
const order = ({ space, contract, version }, fields = {}) =>
  new PaymentModel({
    orderCode: nextNumber(), orgId: space.id, createdBy: space.owner._id, purpose: 'contract_review', action: 'purchase',
    contractId: contract._id, versionId: version._id, pageCount: 8, reviewUnits: 2, amount: 20000,
    paidAt: new Date(), ...fields,
  });
const purchasesOf = ({ space }) => ContractReviewPurchaseModel.find({ orgId: space.id }).lean();
const INCOMPLETE = 'Thông tin thanh toán hợp đồng chưa đầy đủ.';
const NO_VERSION = 'Không tìm thấy phiên bản hợp đồng đã thanh toán.';

/** An unused purchase of version 1 and a longer version 2 that needs one more unit. */
async function carrySetup(fields) {
  const s = await setup();
  const purchase = await addPurchase(s.space, s.contract, s.version._id, fields);
  const next = await addVersion(s.contract, 13, 2);
  const topUp = order(s, { versionId: next._id, pageCount: 13, reviewUnits: 3, amount: 10000, carryPurchaseId: purchase._id });
  return { ...s, purchase, next, topUp };
}

beforeAll(start);
afterAll(stop);

test('UTCID01: a paid order creates the review purchase with 20 included chat questions', async () => {
  const s = await setup();
  const paid = order(s);
  await activateContractReviewPurchase(paid);
  const [purchase] = await purchasesOf(s);
  expect(purchase).toMatchObject({
    orderCode: paid.orderCode, versionId: s.version._id, pageCount: 8, units: 2, amount: 20000,
    status: 'available', chatAllowance: 20, chatUsed: 0,
  });
});

test('UTCID02: the same order activated twice creates one purchase', async () => {
  const s = await setup();
  const paid = order(s);
  await activateContractReviewPurchase(paid);
  await activateContractReviewPurchase(paid);
  expect(await purchasesOf(s)).toHaveLength(1);
});

test('UTCID03: an extra payment moves the earlier purchase to the longer version', async () => {
  const s = await carrySetup();
  await activateContractReviewPurchase(s.topUp);
  expect(await purchaseById(s.purchase)).toMatchObject({
    versionId: s.next._id, pageCount: 13, units: 3, amount: 30000, extraOrderCodes: [s.topUp.orderCode],
  });
  expect(await purchasesOf(s)).toHaveLength(1);
});

test('UTCID04: the same extra payment activated twice is added once', async () => {
  const s = await carrySetup();
  await activateContractReviewPurchase(s.topUp);
  await activateContractReviewPurchase(s.topUp);
  expect((await purchaseById(s.purchase)).amount).toBe(30000);
});

test('UTCID05: an order without a page count is rejected', async () => {
  const s = await setup();
  await expectError(activateContractReviewPurchase(order(s, { pageCount: undefined })), INCOMPLETE, 409);
  expect(await purchasesOf(s)).toHaveLength(0);
});

test('UTCID06: an order that is not paid is rejected', async () => {
  const s = await setup();
  await expectError(activateContractReviewPurchase(order(s, { paidAt: undefined })), INCOMPLETE, 409);
  expect(await purchasesOf(s)).toHaveLength(0);
});

test('UTCID07: a version that no longer exists is rejected', async () => {
  const s = await setup();
  await expectError(activateContractReviewPurchase(order(s, { versionId: missingId() })), NO_VERSION, 409);
  expect(await purchasesOf(s)).toHaveLength(0);
});

test('UTCID08: the contract of another account is rejected', async () => {
  const [s, other] = [await setup(), await setup()];
  const paid = order(s, { contractId: other.contract._id, versionId: other.version._id });
  await expectError(activateContractReviewPurchase(paid), NO_VERSION, 409);
  expect(await purchasesOf(s)).toHaveLength(0);
});

test('UTCID09: a version already paid by another order is rejected', async () => {
  const s = await setup();
  await activateContractReviewPurchase(order(s));
  await expectError(activateContractReviewPurchase(order(s)), 'Phiên bản hợp đồng đã được thanh toán bằng đơn khác.', 409);
  expect(await purchasesOf(s)).toHaveLength(1);
});

test('UTCID10: an earlier purchase that does not exist is rejected', async () => {
  const s = await setup();
  await expectError(activateContractReviewPurchase(order(s, { carryPurchaseId: missingId() })),
    'Không tìm thấy lượt rà soát đã thanh toán trước.', 409);
  expect(await purchasesOf(s)).toHaveLength(0);
});

test('UTCID11: an earlier purchase that was already used is rejected', async () => {
  const s = await carrySetup({ status: 'consumed' });
  await expectError(activateContractReviewPurchase(s.topUp), 'Lượt rà soát đã thanh toán trước không còn khả dụng.', 409);
  expect(await purchaseById(s.purchase)).toMatchObject({ units: 2, amount: 20000 });
});
