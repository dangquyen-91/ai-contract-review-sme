// Unit test cases for SUB-14 finishUsage (UTCID01–UTCID14 in the test-case sheet).
const {
  start, stop, missingId, personal, addPeriod, periodById, contractOf, addPurchase, purchaseById, usage, expectError,
  UsageRunModel,
} = require('./helpers/billing');
const { reserveUsage, finishUsage } = require('../dist/services/billing/usage.service');

/** A Personal Pro account with a reserved run, optionally backed by a paid 2-unit review. */
async function reserved(kind, { pages = 8, purchased = false } = {}) {
  const space = await personal();
  const period = await addPeriod(space, 'personal_pro');
  const { contract, version } = await contractOf(space, pages);
  const purchase = purchased ? await addPurchase(space, contract, version._id) : null;
  const { run } = await reserveUsage(usage(space, kind, contract));
  return { space, period, purchase, run };
}
const finish = ({ space, run }, success, result, commit) => finishUsage(space.id, run.id, success, result, commit);
const runOf = ({ run }) => UsageRunModel.findById(run._id).select('+result').lean();
const expireLease = ({ run }) => UsageRunModel.updateOne({ _id: run._id }, { $set: { leaseExpiresAt: new Date(Date.now() - 1000) } });
const EXPIRED = 'Yêu cầu AI đã hết thời gian xử lý. Kết quả chưa được lưu; vui lòng thử lại.';

beforeAll(start);
afterAll(stop);

test('UTCID01: a successful request consumes the unit and stores the result', async () => {
  const s = await reserved('chat');
  await finish(s, true, { answer: 'Đáp án' });
  expect(await periodById(s.period)).toMatchObject({ chatUsed: 1, chatReserved: 0 });
  expect(await runOf(s)).toMatchObject({ status: 'succeeded', result: { answer: 'Đáp án' } });
});

test('UTCID02: a failed request gives the unit back', async () => {
  const s = await reserved('chat');
  await finish(s, false);
  expect(await periodById(s.period)).toMatchObject({ chatUsed: 0, chatReserved: 0 });
  expect(await runOf(s)).toMatchObject({
    status: 'failed', error: 'Yêu cầu thất bại hoặc đã bị hủy; các lượt đã giữ được hoàn lại.',
  });
});

test('UTCID03: a successful paid review consumes the purchase and the extra plan unit', async () => {
  const s = await reserved('analysis', { pages: 13, purchased: true });
  await finish(s, true);
  expect((await purchaseById(s.purchase)).status).toBe('consumed');
  expect(await periodById(s.period)).toMatchObject({ analysisUsed: 1, analysisReserved: 0 });
});

test('UTCID04: a failed paid review restores the purchase and the extra plan unit', async () => {
  const s = await reserved('analysis', { pages: 13, purchased: true });
  await finish(s, false);
  const purchase = await purchaseById(s.purchase);
  expect(purchase.status).toBe('available');
  expect(purchase.runId).toBeUndefined();
  expect(await periodById(s.period)).toMatchObject({ analysisUsed: 0, analysisReserved: 0 });
});

test('UTCID05: a successful question uses the included chat', async () => {
  const s = await reserved('chat', { purchased: true });
  await finish(s, true);
  expect(await purchaseById(s.purchase)).toMatchObject({ chatUsed: 1, chatReserved: 0 });
  expect((await periodById(s.period)).chatUsed).toBe(0);
});

test('UTCID06: a failed question gives the included chat back', async () => {
  const s = await reserved('chat', { purchased: true });
  await finish(s, false);
  expect(await purchaseById(s.purchase)).toMatchObject({ chatUsed: 0, chatReserved: 0 });
});

test('UTCID07: finishing a successful request again charges nothing more', async () => {
  const s = await reserved('chat');
  await finish(s, true);
  await finish(s, true);
  expect(await periodById(s.period)).toMatchObject({ chatUsed: 1, chatReserved: 0 });
});

test('UTCID08: failing a failed request again refunds nothing more', async () => {
  const s = await reserved('chat');
  await finish(s, false);
  await finish(s, false);
  expect(await periodById(s.period)).toMatchObject({ chatUsed: 0, chatReserved: 0 });
});

test('UTCID09: a failure after the time limit still gives the unit back', async () => {
  const s = await reserved('chat');
  await expireLease(s);
  await finish(s, false);
  expect(await periodById(s.period)).toMatchObject({ chatUsed: 0, chatReserved: 0 });
  expect((await runOf(s)).status).toBe('failed');
});

test('UTCID10: a success after the time limit is rejected', async () => {
  const s = await reserved('chat');
  await expireLease(s);
  await expectError(finish(s, true), EXPIRED, 409);
  expect((await periodById(s.period)).chatUsed).toBe(0);
});

test('UTCID11: a failed request cannot become successful', async () => {
  const s = await reserved('chat');
  await finish(s, false);
  await expectError(finish(s, true), EXPIRED, 409);
  expect((await runOf(s)).status).toBe('failed');
  expect((await periodById(s.period)).chatUsed).toBe(0);
});

test('UTCID12: nothing is charged when saving the result fails', async () => {
  const s = await reserved('chat');
  await expect(finish(s, true, {}, async () => { throw new Error('save failed'); })).rejects.toThrow('save failed');
  expect(await periodById(s.period)).toMatchObject({ chatUsed: 0, chatReserved: 1 });
  expect((await runOf(s)).status).toBe('reserved');
});

test('UTCID13: a request that does not exist is not found', async () => {
  const space = await personal();
  await expectError(finishUsage(space.id, missingId(), true), 'Không tìm thấy yêu cầu sử dụng AI.', 404);
});

test('UTCID14: the request of another account is not found', async () => {
  const [mine, other] = [await personal(), await reserved('chat')];
  await expectError(finishUsage(mine.id, other.run.id, true), 'Không tìm thấy yêu cầu sử dụng AI.', 404);
  expect((await runOf(other)).status).toBe('reserved');
});
