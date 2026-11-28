// Unit test cases for SUB-13 reserveUsage (UTCID01–UTCID15 in the test-case sheet).
const {
  start, stop, mongoose, business, personal, addPeriod, periodById, contractOf, addPurchase, purchaseById, usage, expectError,
  UsageRunModel,
} = require('./helpers/billing');
const { reserveUsage, finishUsage } = require('../dist/services/billing/usage.service');
const { ContractDraftModel } = require('../dist/models/contractDraft.model');

async function proUser(pages = 8, periodFields = {}) {
  const space = await personal();
  return { space, period: await addPeriod(space, 'personal_pro', periodFields), ...(await contractOf(space, pages)) };
}
const runsOf = (space) => UsageRunModel.countDocuments({ orgId: space.id });

beforeAll(start);
afterAll(stop);

test('UTCID01: a chat question reserves one unit of the plan', async () => {
  const { space, period, contract } = await proUser();
  const { run, replayed } = await reserveUsage(usage(space, 'chat', contract));
  expect(replayed).toBe(false);
  expect(run).toMatchObject({ status: 'reserved', kind: 'chat', units: 1 });
  expect(await periodById(period)).toMatchObject({ chatReserved: 1, chatUsed: 0 });
});

test('UTCID02: reviewing 8 pages reserves two units of the plan', async () => {
  const { space, period, contract, version } = await proUser();
  const { run } = await reserveUsage(usage(space, 'analysis', contract));
  expect(run).toMatchObject({ units: 2, pageCount: 8, versionId: version._id });
  expect((await periodById(period)).analysisReserved).toBe(2);
});

test('UTCID03: an organization in its trial can draft', async () => {
  const space = await business();
  const period = await addPeriod(space, 'business_trial', { from: -1, to: 6 });
  const draftId = new mongoose.Types.ObjectId();
  await ContractDraftModel.collection.insertOne({ _id: draftId, orgId: space.company._id, createdBy: space.owner._id });
  await reserveUsage(usage(space, 'drafting', null, { draftId: String(draftId) }));
  expect((await periodById(period)).draftingReserved).toBe(1);
});

test('UTCID04: a paid review is used before the plan', async () => {
  const { space, period, contract, version } = await proUser();
  const purchase = await addPurchase(space, contract, version._id);
  const { run } = await reserveUsage(usage(space, 'analysis', contract));
  expect(await purchaseById(purchase)).toMatchObject({ status: 'reserved', runId: run._id });
  expect((await periodById(period)).analysisReserved).toBe(0);
});

test('UTCID05: a paid review that is too small takes the missing unit from the plan', async () => {
  const { space, period, contract, version } = await proUser(13);
  const purchase = await addPurchase(space, contract, version._id);
  const { run } = await reserveUsage(usage(space, 'analysis', contract));
  expect(run).toMatchObject({ units: 3, planUnits: 1 });
  expect((await purchaseById(purchase)).status).toBe('reserved');
  expect((await periodById(period)).analysisReserved).toBe(1);
});

test('UTCID06: chat included with a paid review is used before the plan', async () => {
  const { space, period, contract, version } = await proUser();
  const purchase = await addPurchase(space, contract, version._id);
  await reserveUsage(usage(space, 'chat', contract));
  expect((await purchaseById(purchase)).chatReserved).toBe(1);
  expect((await periodById(period)).chatReserved).toBe(0);
});

test('UTCID07: repeating a finished request returns its result without a new charge', async () => {
  const { space, period, contract } = await proUser();
  const input = usage(space, 'chat', contract);
  const first = await reserveUsage(input);
  await finishUsage(space.id, first.run.id, true, { answer: 'Đáp án' });
  const second = await reserveUsage(input);
  expect(second.replayed).toBe(true);
  expect(second.run.result).toEqual({ answer: 'Đáp án' });
  expect(await periodById(period)).toMatchObject({ chatUsed: 1, chatReserved: 0 });
});

test('UTCID08: a review that needs exactly the remaining units is accepted', async () => {
  const { space, period, contract } = await proUser(8, { analysisUsed: 28 });
  await reserveUsage(usage(space, 'analysis', contract));
  expect((await periodById(period)).analysisReserved).toBe(2);
});

test('UTCID09: a review that needs one unit too many is rejected', async () => {
  const { space, period, contract } = await proUser(8, { analysisUsed: 29 });
  await expectError(reserveUsage(usage(space, 'analysis', contract)),
    'Không đủ lượt rà soát AI. Cần 2 lượt, còn 1 lượt trong kỳ. Vui lòng mua thêm lượt, nâng cấp gói hoặc chờ kỳ tiếp theo.',
    403, 'ANALYSIS_QUOTA_EXHAUSTED');
  expect((await periodById(period)).analysisReserved).toBe(0);
  expect(await runsOf(space)).toBe(0);
});

test('UTCID10: an organization without a plan is rejected', async () => {
  const space = await business();
  const { contract } = await contractOf(space);
  await expectError(reserveUsage(usage(space, 'chat', contract)),
    'Cần gói dịch vụ AI đang hoạt động để thực hiện thao tác này.', 403, 'AI_PLAN_REQUIRED');
  expect(await runsOf(space)).toBe(0);
});

test('UTCID11: the same request code for different content is rejected', async () => {
  const { space, period, contract } = await proUser();
  const input = usage(space, 'chat', contract);
  await reserveUsage(input);
  await expectError(reserveUsage({ ...input, payload: { question: 'Câu khác' } }),
    'Mã yêu cầu đã được dùng cho thao tác khác. Vui lòng tải lại và thử lại.', 409);
  expect((await periodById(period)).chatReserved).toBe(1);
});

test('UTCID12: a contract that is being reviewed cannot be reviewed again', async () => {
  const { space, period, contract } = await proUser();
  await reserveUsage(usage(space, 'analysis', contract));
  await expectError(reserveUsage(usage(space, 'analysis', contract)),
    'Hợp đồng đang được rà soát. Vui lòng chờ yêu cầu hiện tại hoàn tất.', 409, 'REVIEW_RUNNING');
  expect((await periodById(period)).analysisReserved).toBe(2);
});

test('UTCID13: a confirmed cost that no longer matches is rejected', async () => {
  const { space, contract } = await proUser();
  await expectError(reserveUsage(usage(space, 'analysis', contract, { confirmedUnits: 1 })),
    'Số lượt cần dùng đã thay đổi. Vui lòng kiểm tra lại trước khi rà soát.', 409, 'REVIEW_QUOTE_CHANGED');
  expect(await runsOf(space)).toBe(0);
});

test('UTCID14: a user outside the organization is rejected', async () => {
  const [space, outsider] = [await business(), await personal()];
  await addPeriod(space, 'business_starter');
  const { contract } = await contractOf(space);
  await expectError(reserveUsage(usage(space, 'chat', contract, { userId: outsider.owner.id })),
    'Bạn không còn quyền truy cập tổ chức này.', 403);
  expect(await runsOf(space)).toBe(0);
});

test('UTCID15: the contract of another account is not found', async () => {
  const [mine, other] = [await proUser(), await proUser()];
  await expectError(reserveUsage(usage(mine.space, 'chat', other.contract)), 'Không tìm thấy hợp đồng.', 404);
  expect(await runsOf(mine.space)).toBe(0);
});
