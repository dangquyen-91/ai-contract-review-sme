process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'payment-test-access';
process.env.JWT_REFRESH_SECRET = 'payment-test-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.PAYOS_CLIENT_ID = 'test-client';
process.env.PAYOS_API_KEY = 'test-api';
process.env.PAYOS_CHECKSUM_KEY = 'test-checksum';
process.env.GEMINI_API_KEY = '';

const request = require('supertest');
const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { PayOS } = require('@payos/node');
const provider = require('../dist/services/billing/payos.service');
const { createApp } = require('../dist/app');
const { logger } = require('../dist/config/logger');
logger.silent = true;
const { PaymentModel } = require('../dist/models/payment.model');
const { OrganizationModel } = require('../dist/models/organization.model');
const { UserModel } = require('../dist/models/user.model');
const { ContractModel } = require('../dist/models/contract.model');
const { ContractVersionModel } = require('../dist/models/contractVersion.model');
const { ContractReviewPurchaseModel } = require('../dist/models/contractReviewPurchase.model');
const { getSubscription } = require('../dist/services/billing/subscription.service');
const { reserveUsage, finishUsage } = require('../dist/services/billing/usage.service');
const {
  SubscriptionModel,
  SubscriptionPeriodModel,
  initializeSubscriptionModels,
} = require('../dist/models/subscription.model');
const {
  seedPlans,
  activatePaidSubscription,
  scheduleDowngrade,
  cancelDowngrade,
  quotePlanCheckout,
} = require('../dist/services/billing/subscription.service');
const { seedTopUpPacks, activateTopUp } = require('../dist/services/billing/topUp.service');
const { UsageTopUpModel } = require('../dist/models/subscription.model');
const { seedDefaultRoles } = require('../dist/services/identity/role.service');
const { sessionFor } = require('../dist/services/identity/auth.service');
const { MembershipModel } = require('../dist/models/membership.model');
const signer = new PayOS({
  clientId: 'test',
  apiKey: 'test',
  checksumKey: 'test-checksum',
  logLevel: 'off',
});
const remoteOrders = new Map();
let app, repl;

// Organization roles live in memberships; standalone personal accounts use their own ID as billing scope.
async function user(org, role = 'owner') {
  const account = await UserModel.create({
    name: 'Payment user',
    email: `${randomUUID()}@example.com`,
    passwordHash: 'unused',
    emailVerifiedAt: new Date(),
  });
  if (org?._id && ['owner', 'staff'].includes(role))
    await MembershipModel.create({ userId: account._id, orgId: org._id, role });
  account.testToken = (await sessionFor(account)).accessToken;
  return account;
}
async function workspace(personal = false) {
  if (personal) {
    const owner = await user(null, 'user');
    return { org: { _id: owner._id, id: owner.id }, owner };
  }
  const org = await OrganizationModel.create({ name: 'Payment workspace' });
  return { org, owner: await user(org, 'owner') };
}
const auth = (u) => `Bearer ${u.testToken}`;
const base = (w) => `/api/v1/organizations/${w.org.id}/payments`;
const create = (w, planCode = 'business_starter', action = 'purchase', key = randomUUID()) =>
  request(app)
    .post(base(w))
    .set('Authorization', auth(w.owner))
    .set('Idempotency-Key', key)
    .send({ planCode, action });
const sync = (w, code) =>
  request(app)
    .post(`${base(w)}/${code}/sync`)
    .set('Authorization', auth(w.owner));
function paid(code) {
  const remote = remoteOrders.get(code);
  remote.status = 'PAID';
  remote.amountPaid = remote.amount;
  remote.amountRemaining = 0;
}
async function event(code) {
  const remote = remoteOrders.get(code);
  const data = {
    orderCode: code,
    amount: remote.amount,
    paymentLinkId: remote.id,
    currency: 'VND',
    code: '00',
    desc: 'success',
    description: 'LawScan',
    accountNumber: 'test-bank',
    reference: 'test-reference',
    transactionDateTime: '2026-10-18 10:00:00',
  };
  return {
    code: '00',
    desc: 'success',
    success: true,
    data,
    signature: await signer.crypto.createSignatureFromObj(data, 'test-checksum'),
  };
}
const webhook = (body) => request(app).post('/api/v1/payments/payos/webhook').send(body);

// Defaults to an exhausted Free quota, so the whole review is paid.
async function personalReview(pages = 8, used = 3) {
  const owner = await user({}, 'user');
  const contract = await ContractModel.create({ ownerType: 'personal', orgId: owner.id, uploadedBy: owner.id, title: 'Personal contract', type: 'labor', ourParty: 'employee' });
  const version = await ContractVersionModel.create({ contractId: contract.id, versionNumber: 1, createdBy: owner.id, extractionStatus: 'completed', extractionQuality: { method: 'text_layer', pageCount: pages, ocrPageCount: 0, lowConfidence: false } });
  const subscription = await getSubscription(owner.id, owner.id);
  await SubscriptionPeriodModel.updateOne({ _id: subscription.periodId }, { $set: { analysisUsed: used } });
  return { owner, org: { id: owner.id }, contract, version };
}
const reviewQuote = w => request(app).get(`/api/v1/contracts/${w.contract.id}/review-payment`).set('Authorization', auth(w.owner));
const purchaseReview = (w, expectedAmount = 20000, key = randomUUID(), versionId = w.version.id) => request(app).post(base(w))
  .set('Authorization', auth(w.owner)).set('Idempotency-Key', key)
  .send({ purpose: 'contract_review', action: 'purchase', contractId: w.contract.id, versionId, expectedAmount });
const reviewUsage = (w, key = randomUUID()) => ({ orgId: w.org.id, userId: w.owner.id, contractId: w.contract.id, versionId: w.version.id, kind: 'analysis', idempotencyKey: key, payload: { versionId: w.version.id } });
async function paidReview(w) {
  const response = await purchaseReview(w);
  expect(response.status).toBe(201);
  paid(response.body.data.orderCode);
  expect((await sync(w, response.body.data.orderCode)).status).toBe(200);
  return response.body.data.orderCode;
}

test('contract review quotes use real five-page units, charge only the shortfall after Free units, and reject forged prices or adequate quotas', async () => {
  const w = await personalReview(8, 2); // 2 units needed, 1 Free unit left
  const quote = await reviewQuote(w);
  expect(quote.status).toBe(200);
  expect(quote.body.data).toMatchObject({ pageCount: 8, units: 2, unitPrice: 10000, availableUnits: 1, planUnits: 1, paidUnits: 0, shortfallUnits: 1, amount: 10000, canPurchase: true });
  expect((await purchaseReview(w, 1)).status).toBe(409);
  expect(await PaymentModel.countDocuments({ orgId: w.org.id })).toBe(0);
  const enough = await personalReview(5, 0);
  expect((await reviewQuote(enough)).body.data.canPurchase).toBe(false);
  expect((await purchaseReview(enough, 10000)).status).toBe(409);
  const other = await user({}, 'user');
  expect((await request(app).get(`/api/v1/contracts/${w.contract.id}/review-payment`).set('Authorization', auth(other))).status).toBe(404);
});

test('contract checkout and provider settlement are idempotent and never activate a subscription', async () => {
  const w = await personalReview(), key = randomUUID();
  const response = await purchaseReview(w, 20000, key);
  expect(response.status).toBe(201);
  expect(response.body.data).toMatchObject({ purpose: 'contract_review', contractId: w.contract.id, versionId: w.version.id, pageCount: 8, reviewUnits: 2, amount: 20000, fulfilledAt: null });
  expect(await ContractReviewPurchaseModel.countDocuments({ orgId: w.org.id })).toBe(0);
  expect((await purchaseReview(w, 20000, key)).body.data.orderCode).toBe(response.body.data.orderCode);
  expect((await purchaseReview(w, 30000, key)).status).toBe(409);
  const code = response.body.data.orderCode;
  paid(code);
  expect((await webhook(await event(code))).status).toBe(200);
  expect((await sync(w, code)).status).toBe(200);
  expect(await ContractReviewPurchaseModel.countDocuments({ orgId: w.org.id })).toBe(1);
  expect((await reviewQuote(w)).body.data.purchaseStatus).toBe('available');
  expect((await getSubscription(w.owner.id, w.org.id))).toMatchObject({ plan: { code: 'personal_free' }, analysis: { used: 3, available: 0 } });
});

test('paid contract reviews refund on failure, serialize concurrent requests and consume once', async () => {
  const w = await personalReview();
  await paidReview(w);
  const failed = await reserveUsage(reviewUsage(w));
  expect(failed.run.reviewPurchaseId).toBeTruthy();
  expect(failed.run.periodId).toBeFalsy();
  await finishUsage(w.org.id, failed.run.id, false);
  expect((await reviewQuote(w)).body.data.purchaseStatus).toBe('available');
  const inputs = [reviewUsage(w), reviewUsage(w)];
  const results = await Promise.allSettled(inputs.map(input => reserveUsage(input)));
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  const index = results.findIndex(result => result.status === 'fulfilled');
  const run = results[index].value.run;
  await finishUsage(w.org.id, run.id, true, { reviewed: true });
  expect((await reserveUsage(inputs[index])).replayed).toBe(true);
  expect((await reviewQuote(w)).body.data.purchaseStatus).toBe('consumed');
  // A spent purchase no longer applies: re-reviewing uses (here: insufficient) plan units.
  await expect(reserveUsage(reviewUsage(w))).rejects.toMatchObject({ statusCode: 403, code: 'ANALYSIS_QUOTA_EXHAUSTED' });
  expect((await purchaseReview(w)).status).toBe(409);
  expect((await getSubscription(w.owner.id, w.org.id)).analysis).toMatchObject({ used: 3, reserved: 0, available: 0 });
});

test('an expired paid-review lease restores the entitlement, which then moves to a new file version of the same size', async () => {
  const w = await personalReview();
  await paidReview(w);
  const { run } = await reserveUsage(reviewUsage(w));
  const { UsageRunModel } = require('../dist/models/subscription.model');
  await UsageRunModel.updateOne({ _id: run.id }, { $set: { leaseExpiresAt: new Date(Date.now() - 1000) } });
  await getSubscription(w.owner.id, w.org.id);
  expect((await reviewQuote(w)).body.data.purchaseStatus).toBe('available');
  const newVersion = await ContractVersionModel.create({ contractId: w.contract.id, versionNumber: 2, createdBy: w.owner.id, extractionStatus: 'completed', extractionQuality: { method: 'text_layer', pageCount: 8, ocrPageCount: 0, lowConfidence: false } });
  // Same number of units: nothing more to pay, and the paid review covers the new version.
  expect((await reviewQuote(w)).body.data).toMatchObject({ paidUnits: 2, amount: 0, canPurchase: false, purchaseStatus: 'available' });
  expect((await purchaseReview(w)).status).toBe(409);
  const moved = await reserveUsage({ ...reviewUsage(w), versionId: newVersion.id });
  expect(moved.run.reviewPurchaseId).toBeTruthy();
  const purchase = await ContractReviewPurchaseModel.findOne({ orgId: w.org.id });
  expect(purchase.toObject()).toMatchObject({ status: 'reserved', versionId: newVersion._id });
});

test('contract deletion is blocked during checkout or while purchased review remains unused', async () => {
  const w = await personalReview();
  const response = await purchaseReview(w);
  expect(response.status).toBe(201);
  expect((await request(app).delete(`/api/v1/contracts/${w.contract.id}`).set('Authorization', auth(w.owner))).status).toBe(409);
  paid(response.body.data.orderCode);
  await sync(w, response.body.data.orderCode);
  expect((await request(app).delete(`/api/v1/contracts/${w.contract.id}`).set('Authorization', auth(w.owner))).status).toBe(409);
});

test('standalone personal checkout activates Pro only after provider confirmation and retains account isolation', async () => {
  const personal = await user({}, 'user');
  const w = { org: { id: personal.id }, owner: personal };
  const response = await create(w, 'personal_pro');
  expect(response.status).toBe(201);
  expect(response.body.data.fulfilledAt).toBeNull();
  expect(await SubscriptionPeriodModel.countDocuments({ orgId: personal.id, 'plan.code': 'personal_pro' })).toBe(0);
  const other = await user({}, 'user');
  const code = response.body.data.orderCode;
  expect((await request(app).get(`${base(w)}/${code}`).set('Authorization', auth(other))).status).toBe(403);
  paid(code);
  expect((await sync(w, code)).status).toBe(200);
  expect((await sync(w, code)).status).toBe(200);
  expect(await SubscriptionPeriodModel.countDocuments({ orgId: personal.id, 'plan.code': 'personal_pro' })).toBe(1);
  expect((await request(app).get(`/api/v1/organizations/${personal.id}/subscription`).set('Authorization', auth(personal))).body.data.plan.code).toBe('personal_pro');
  expect((await UserModel.findById(personal.id)).orgId).toBeFalsy();
  expect(await OrganizationModel.findById(personal.id)).toBeNull();
});

beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  await seedDefaultRoles();
  await initializeSubscriptionModels();
  await Promise.all([PaymentModel.init(), OrganizationModel.init(), UserModel.init()]);
  await seedPlans();
  await seedTopUpPacks();
  app = createApp();
  jest.spyOn(provider, 'createPaymentLink').mockImplementation(async (input) => {
    const id = `link-${input.orderCode}`;
    remoteOrders.set(input.orderCode, {
      id,
      orderCode: input.orderCode,
      amount: input.amount,
      amountPaid: 0,
      amountRemaining: input.amount,
      status: 'PENDING',
      transactions: [],
    });
    return {
      ...input,
      paymentLinkId: id,
      currency: 'VND',
      status: 'PENDING',
      checkoutUrl: `https://pay.payos.vn/test/${id}`,
      qrCode: 'test-qr',
    };
  });
  jest
    .spyOn(provider, 'getPaymentLink')
    .mockImplementation(async (code) => ({ ...remoteOrders.get(code) }));
  jest.spyOn(provider, 'cancelPaymentLink').mockImplementation(async (code) => {
    const remote = remoteOrders.get(code);
    if (remote.status !== 'PAID') remote.status = 'CANCELLED';
    return { ...remote };
  });
});
afterAll(async () => {
  jest.restoreAllMocks();
  await mongoose.disconnect();
  if (repl) await repl.stop();
});

test('checkout uses server price, saves order and grants no paid rights before settlement', async () => {
  const w = await workspace();
  const response = await create(w);
  expect(response.status).toBe(201);
  expect(response.body.data).toMatchObject({
    amount: 499000,
    status: 'pending',
    fulfilledAt: null,
  });
  expect(
    await SubscriptionPeriodModel.countDocuments({
      orgId: w.org.id,
      paymentReference: { $exists: true },
    }),
  ).toBe(0);
  const forged = await request(app)
    .post(base(await workspace()))
    .set('Authorization', auth(w.owner))
    .set('Idempotency-Key', randomUUID())
    .send({ planCode: 'business_starter', action: 'purchase', amount: 1 });
  expect(forged.status).toBe(400);
});

test('duplicate checkout retries return one order and changed payload cannot reuse its key', async () => {
  const w = await workspace(),
    key = randomUUID();
  const results = await Promise.all([
    create(w, 'business_starter', 'purchase', key),
    create(w, 'business_starter', 'purchase', key),
  ]);
  expect(results.map((r) => r.status)).toEqual([201, 201]);
  expect(results[0].body.data.orderCode).toBe(results[1].body.data.orderCode);
  expect(await PaymentModel.countDocuments({ orgId: w.org.id })).toBe(1);
  expect((await create(w, 'business_pro', 'purchase', key)).status).toBe(409);
  // A different checkout replaces the abandoned, unpaid order instead of being blocked.
  const replacement = await create(w);
  expect(replacement.status).toBe(201);
  expect((await PaymentModel.findOne({ orderCode: results[0].body.data.orderCode })).toObject()).toMatchObject({ status: 'cancelled', isOpen: false });
});

test('staff and users in another organization cannot create, read, synchronize or cancel orders', async () => {
  const w = await workspace(),
    other = await workspace();
  const staff = await user(w.org, 'staff');
  const response = await create(w),
    code = response.body.data.orderCode;
  for (const account of [staff, other.owner]) {
    expect(
      (
        await request(app)
          .post(base(w))
          .set('Authorization', auth(account))
          .set('Idempotency-Key', randomUUID())
          .send({ planCode: 'business_starter', action: 'purchase' })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .get(`${base(w)}/${code}`)
          .set('Authorization', auth(account))
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post(`${base(w)}/${code}/sync`)
          .set('Authorization', auth(account))
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post(`${base(w)}/${code}/cancel`)
          .set('Authorization', auth(account))
      ).status,
    ).toBe(403);
  }
  expect((await request(app).post(base(w)).send({})).status).toBe(401);
});

test('personal accounts buy personal plans only; free and wrong family are rejected', async () => {
  const w = await workspace(true);
  expect((await create(w, 'personal_free')).status).toBe(400);
  expect((await create(w)).status).toBe(400);
  const response = await create(w, 'personal_pro');
  expect(response.status).toBe(201);
  paid(response.body.data.orderCode);
  expect((await webhook(await event(response.body.data.orderCode))).status).toBe(200);
  expect((await PaymentModel.findOne({ orgId: w.org.id })).fulfilledAt).toBeTruthy();
});

test('real SDK rejects forged or tampered signatures and accepts signed setup probes without granting rights', async () => {
  const w = await workspace(),
    response = await create(w),
    code = response.body.data.orderCode;
  paid(code);
  const body = await event(code);
  body.data.amount = 1;
  expect((await webhook(body)).status).toBe(400);
  expect((await webhook({})).status).toBe(400);
  const probe = await event(code);
  probe.data.orderCode = 123;
  probe.signature = await signer.crypto.createSignatureFromObj(probe.data, 'test-checksum');
  expect((await webhook(probe)).status).toBe(200);
  expect((await PaymentModel.findOne({ orderCode: code })).paidAt).toBeFalsy();
});

test('concurrent repeated successful webhooks activate exactly one subscription period', async () => {
  const w = await workspace(),
    response = await create(w),
    code = response.body.data.orderCode;
  paid(code);
  const body = await event(code);
  const responses = await Promise.all([webhook(body), webhook(body), webhook(body)]);
  expect(responses.map((r) => r.status)).toEqual([200, 200, 200]);
  expect(await SubscriptionPeriodModel.countDocuments({ paymentReference: `payos:${code}` })).toBe(
    1,
  );
  const order = await PaymentModel.findOne({ orderCode: code });
  expect(order.status).toBe('paid');
  expect(order.fulfilledAt).toBeTruthy();
  expect(order.isOpen).toBe(false);
});

test('provider amount mismatch or wrong payment link never activates a plan', async () => {
  const w = await workspace(),
    response = await create(w),
    code = response.body.data.orderCode;
  paid(code);
  remoteOrders.get(code).amountPaid = 1;
  expect((await webhook(await event(code))).status).toBe(409);
  expect((await PaymentModel.findOne({ orderCode: code })).paidAt).toBeFalsy();
  remoteOrders.get(code).amountPaid = remoteOrders.get(code).amount;
  remoteOrders.get(code).id = 'wrong-id';
  expect((await sync(w, code)).status).toBe(409);
  expect(await SubscriptionPeriodModel.countDocuments({ paymentReference: `payos:${code}` })).toBe(
    0,
  );
});

test('browser GET does not activate; explicit sync recovers a missed webhook', async () => {
  const w = await workspace(),
    response = await create(w),
    code = response.body.data.orderCode;
  paid(code);
  const read = await request(app)
    .get(`${base(w)}/${code}`)
    .set('Authorization', auth(w.owner));
  expect(read.body.data.status).toBe('pending');
  expect((await sync(w, code)).body.data.fulfilledAt).toBeTruthy();
  expect((await sync(w, code)).status).toBe(200);
  expect(await SubscriptionPeriodModel.countDocuments({ paymentReference: `payos:${code}` })).toBe(
    1,
  );
});

test('cancelled and expired unpaid links grant no rights and release the open order', async () => {
  const w = await workspace(),
    response = await create(w),
    code = response.body.data.orderCode;
  const cancelled = await request(app)
    .post(`${base(w)}/${code}/cancel`)
    .set('Authorization', auth(w.owner));
  expect(cancelled.body.data.status).toBe('cancelled');
  const next = await create(w);
  expect(next.status).toBe(201);
  remoteOrders.get(next.body.data.orderCode).status = 'EXPIRED';
  expect((await sync(w, next.body.data.orderCode)).body.data.status).toBe('expired');
  expect(
    await SubscriptionPeriodModel.countDocuments({
      orgId: w.org.id,
      paymentReference: { $exists: true },
    }),
  ).toBe(0);
});

test('payment winning a cancellation race is fulfilled, not marked cancelled', async () => {
  const w = await workspace(),
    response = await create(w),
    code = response.body.data.orderCode;
  paid(code);
  const cancelled = await request(app)
    .post(`${base(w)}/${code}/cancel`)
    .set('Authorization', auth(w.owner));
  expect(cancelled.body.data).toMatchObject({ status: 'paid' });
  expect(cancelled.body.data.fulfilledAt).toBeTruthy();
});

test('partial payment is retained for support and cannot open another checkout', async () => {
  const w = await workspace(),
    response = await create(w),
    code = response.body.data.orderCode;
  remoteOrders.get(code).amountPaid = 1000;
  remoteOrders.get(code).status = 'CANCELLED';
  const result = await sync(w, code);
  expect(result.body.data.providerError).toMatch(/Partial payment/);
  expect((await create(w)).status).toBe(409);
});

test('activation failure retains payment and sync can recover without double activation', async () => {
  const w = await workspace(),
    response = await create(w),
    code = response.body.data.orderCode;
  const extra = await Promise.all(Array.from({ length: 5 }, () => user(w.org, 'staff')));
  paid(code);
  expect((await webhook(await event(code))).status).toBe(503);
  const pending = await PaymentModel.findOne({ orderCode: code });
  expect(pending.paidAt).toBeTruthy();
  expect(pending.fulfilledAt).toBeFalsy();
  expect(pending.fulfillmentError).toBeTruthy();
  await MembershipModel.deleteMany({ userId: { $in: extra.map((u) => u._id) } });
  expect((await sync(w, code)).body.data.fulfilledAt).toBeTruthy();
  expect(await SubscriptionPeriodModel.countDocuments({ paymentReference: `payos:${code}` })).toBe(
    1,
  );
});

test('upgrade checkout credits the unused paid time and leaves the old period intact until paid', async () => {
  const w = await workspace();
  const old = await activatePaidSubscription({
    orgId: w.org.id,
    planCode: 'business_starter',
    amount: 499000,
    action: 'purchase',
    paymentReference: randomUUID(),
  });
  const response = await create(w, 'business_pro', 'upgrade');
  expect(response.status).toBe(201);
  // Starter was just bought, so almost all of its price is credited.
  expect(response.body.data.amount).toBeGreaterThan(999000 - 499000);
  expect(response.body.data.amount).toBeLessThan(999000 - 499000 + 100);
  expect((await SubscriptionPeriodModel.findById(old._id)).cancelledAt).toBeFalsy();
  paid(response.body.data.orderCode);
  await webhook(await event(response.body.data.orderCode));
  expect((await SubscriptionPeriodModel.findById(old._id)).cancelledAt).toBeTruthy();
  const period = await SubscriptionPeriodModel.findOne({
    paymentReference: `payos:${response.body.data.orderCode}`,
  });
  expect(period.paidAmount).toBe(response.body.data.amount);
  expect(period.startsAt.getTime()).toBeLessThan(old.endsAt.getTime());
});
test('renewal opens in the last week, pays one period ahead, and a scheduled downgrade is paid as that renewal', async () => {
  const w = await workspace();
  const old = await businessPro(w);
  const renewal = async () => (await getSubscription(w.owner.id, w.org.id)).renewal;
  expect(await renewal()).toMatchObject({ status: 'not_open', planCode: 'business_pro', payable: true });
  const early = await create(w, 'business_pro', 'renew');
  expect(early.status).toBe(409);
  expect(early.body.error.code).toBe('RENEWAL_NOT_OPEN');
  await openRenewal(old);
  expect(await renewal()).toMatchObject({ status: 'open', planCode: 'business_pro' });
  // A lower plan cannot be bought directly: it is scheduled, then paid as the renewal.
  const direct = await create(w, 'business_starter', 'downgrade');
  expect(direct.status).toBe(409);
  expect(direct.body.error.code).toBe('DOWNGRADE_NOT_SCHEDULED');
  await scheduleDowngrade(w.owner.id, w.org.id, 'business_starter');
  const quote = await request(app)
    .get(`/api/v1/organizations/${w.org.id}/subscription/quote`)
    .query({ planCode: 'business_starter' })
    .set('Authorization', auth(w.owner));
  expect(quote.body.data).toMatchObject({ action: 'renew', needsSchedule: false, amount: 499000, blockReason: null });
  expect((await create(w, 'business_pro', 'renew')).status).toBe(409);
  const down = await create(w, 'business_starter', 'renew');
  expect(down.status).toBe(201);
  paid(down.body.data.orderCode);
  await webhook(await event(down.body.data.orderCode));
  const period = await SubscriptionPeriodModel.findOne({
    paymentReference: `payos:${down.body.data.orderCode}`,
  });
  const current = await SubscriptionPeriodModel.findById(old._id);
  expect(period.startsAt).toEqual(current.endsAt);
  expect(period.plan.code).toBe('business_starter');
  expect(await renewal()).toMatchObject({ status: 'renewed' });
  const again = await create(w, 'business_starter', 'renew');
  expect(again.status).toBe(409);
  expect(again.body.error.code).toBe('ALREADY_RENEWED');
});
test('uncertain provider creation keeps the order recoverable instead of allowing another charge', async () => {
  const w = await workspace(),
    key = randomUUID();
  provider.createPaymentLink.mockRejectedValueOnce(new Error('private-provider-error'));
  const response = await create(w, 'business_starter', 'purchase', key);
  expect(response.status).toBe(502);
  expect(JSON.stringify(response.body)).not.toContain('private-provider-error');
  const retry = await create(w, 'business_starter', 'purchase', key);
  expect(retry.status).toBe(201);
  expect(retry.body.data.status).toBe('creating');
  expect(retry.body.data.providerError).toBeTruthy();
  expect((await create(w)).status).toBe(409);
});

const DAY = 24 * 60 * 60 * 1000;
// Moves a paid period into its last days so the renewal window is open.
const openRenewal = (period, daysLeft = 3) =>
  SubscriptionPeriodModel.updateOne(
    { _id: period._id },
    { $set: { startsAt: new Date(Date.now() - (30 - daysLeft) * DAY), endsAt: new Date(Date.now() + daysLeft * DAY) } },
  );
const businessPro = (w) =>
  activatePaidSubscription({
    orgId: w.org.id,
    planCode: 'business_pro',
    amount: 999000,
    action: 'purchase',
    paymentReference: randomUUID(),
  });
const cancelOrder = (w, code) =>
  request(app).post(`${base(w)}/${code}/cancel`).set('Authorization', auth(w.owner));

test('an unpaid plan order freezes the downgrade schedule so settlement cannot be stranded', async () => {
  const w = await workspace();
  await openRenewal(await businessPro(w));
  const renew = await create(w, 'business_pro', 'renew');
  expect(renew.status).toBe(201);
  await expect(scheduleDowngrade(w.owner.id, w.org.id, 'business_starter')).rejects.toMatchObject({
    statusCode: 409,
    code: 'PLAN_PAYMENT_IN_PROGRESS',
  });
  expect((await cancelOrder(w, renew.body.data.orderCode)).status).toBe(200);
  await scheduleDowngrade(w.owner.id, w.org.id, 'business_starter');
  const down = await create(w, 'business_starter', 'renew');
  expect(down.status).toBe(201);
  await expect(cancelDowngrade(w.owner.id, w.org.id)).rejects.toMatchObject({
    statusCode: 409,
    code: 'PLAN_PAYMENT_IN_PROGRESS',
  });
  paid(down.body.data.orderCode);
  expect((await webhook(await event(down.body.data.orderCode))).status).toBe(200);
  const order = await PaymentModel.findOne({ orderCode: down.body.data.orderCode });
  expect(order.fulfilledAt).toBeTruthy();
  expect(order.isOpen).toBe(false);
});

test('a renewal that settles after the current period lapsed starts a fresh period instead of being stranded', async () => {
  const w = await workspace();
  const old = await businessPro(w);
  await openRenewal(old);
  const renew = await create(w, 'business_pro', 'renew');
  expect(renew.status).toBe(201);
  // Checkout happened while Pro was active; the transfer is confirmed after it ended.
  const lapsedAt = new Date(Date.now() - 5 * 60_000);
  await SubscriptionPeriodModel.updateOne(
    { _id: old._id },
    { $set: { startsAt: new Date(lapsedAt.getTime() - 30 * DAY), endsAt: lapsedAt } },
  );
  await PaymentModel.collection.updateOne(
    { orderCode: renew.body.data.orderCode },
    { $set: { quotedAt: new Date(lapsedAt.getTime() - 10 * 60_000) } },
  );
  paid(renew.body.data.orderCode);
  expect((await webhook(await event(renew.body.data.orderCode))).status).toBe(200);
  const order = await PaymentModel.findOne({ orderCode: renew.body.data.orderCode });
  expect(order.fulfillmentError).toBeFalsy();
  expect(order.isOpen).toBe(false);
  const renewed = await SubscriptionPeriodModel.findOne({
    paymentReference: `payos:${renew.body.data.orderCode}`,
  });
  expect(renewed.startsAt.getTime()).toBeGreaterThanOrEqual(order.paidAt.getTime());
  expect(await getSubscription(w.owner.id, w.org.id)).toMatchObject({
    status: 'active',
    plan: { code: 'business_pro' },
  });
});

test('an unpaid downgrade schedule lapses after the renewal grace period and stops blocking the account', async () => {
  const w = await workspace();
  const old = await businessPro(w);
  await scheduleDowngrade(w.owner.id, w.org.id, 'business_starter');
  const lapse = async (effectiveAt) => {
    await SubscriptionPeriodModel.updateOne(
      { _id: old._id },
      { $set: { startsAt: new Date(effectiveAt.getTime() - 30 * DAY), endsAt: effectiveAt } },
    );
    await SubscriptionModel.updateOne(
      { orgId: w.org.id },
      { $set: { 'scheduledDowngrade.effectiveAt': effectiveAt } },
    );
  };
  await lapse(new Date(Date.now() - DAY));
  const pending = await getSubscription(w.owner.id, w.org.id);
  expect(pending.status).toBe('expired');
  expect(pending.scheduledDowngrade).toMatchObject({ planCode: 'business_starter' });
  expect((await create(w, 'business_starter', 'purchase')).status).toBe(409);

  await lapse(new Date(Date.now() - 40 * DAY));
  const released = await getSubscription(w.owner.id, w.org.id);
  expect(released.scheduledDowngrade).toBeNull();
  expect(released.members.limit).toBe(3);
  expect((await SubscriptionModel.findOne({ orgId: w.org.id })).scheduledDowngrade).toBeFalsy();
  expect((await create(w, 'business_starter', 'downgrade')).status).toBe(409);
  expect((await create(w, 'business_starter', 'purchase')).status).toBe(201);
});

const topUp = (w, packCode, expectedAmount, key = randomUUID()) =>
  request(app)
    .post(base(w))
    .set('Authorization', auth(w.owner))
    .set('Idempotency-Key', key)
    .send({ purpose: 'top_up', action: 'purchase', packCode, expectedAmount });
const chatUsage = (w, contract) => ({
  orgId: w.org.id,
  userId: w.owner.id,
  contractId: contract.id,
  kind: 'chat',
  idempotencyKey: randomUUID(),
  payload: { message: 'hello' },
});

test('a paid plan that ran out mid-period can buy extra units that are usable immediately and credited once', async () => {
  const w = await workspace();
  const period = await activatePaidSubscription({
    orgId: w.org.id,
    planCode: 'business_starter',
    amount: 499000,
    action: 'purchase',
    paymentReference: randomUUID(),
  });
  const contract = await ContractModel.create({
    ownerType: 'organization',
    orgId: w.org.id,
    uploadedBy: w.owner.id,
    title: 'Business contract',
    type: 'service',
  });
  await SubscriptionPeriodModel.updateOne({ _id: period._id }, { $set: { chatUsed: 500 } });
  await expect(reserveUsage(chatUsage(w, contract))).rejects.toMatchObject({
    code: 'CHAT_QUOTA_EXHAUSTED',
  });
  const packs = await request(app).get('/api/v1/top-up-packs');
  expect(packs.body.data.find((pack) => pack.code === 'business_chat_300')).toMatchObject({
    kind: 'chat',
    units: 300,
    price: 99000,
  });
  const key = randomUUID();
  const order = await topUp(w, 'business_chat_300', 99000, key);
  expect(order.status).toBe(201);
  expect(order.body.data).toMatchObject({ purpose: 'top_up', packCode: 'business_chat_300', amount: 99000, topUpUnits: 300 });
  expect((await topUp(w, 'business_chat_300', 99000, key)).body.data.orderCode).toBe(order.body.data.orderCode);
  expect((await getSubscription(w.owner.id, w.org.id)).chat.available).toBe(0);
  const code = order.body.data.orderCode;
  paid(code);
  expect((await webhook(await event(code))).status).toBe(200);
  expect((await webhook(await event(code))).status).toBe(200);
  expect((await sync(w, code)).body.data.fulfilledAt).toBeTruthy();
  expect((await getSubscription(w.owner.id, w.org.id)).chat).toMatchObject({
    used: 500,
    limit: 800,
    planLimit: 500,
    bonus: 300,
    available: 300,
  });
  expect(await UsageTopUpModel.countDocuments({ paymentReference: `payos:${code}` })).toBe(1);
  const { run } = await reserveUsage(chatUsage(w, contract));
  await finishUsage(w.org.id, run.id, true, { reply: 'ok' });
  expect((await getSubscription(w.owner.id, w.org.id)).chat.available).toBe(299);
  // Top-up orders never count as plan orders that freeze the downgrade schedule.
  expect((await SubscriptionModel.findOne({ orgId: w.org.id }))?.scheduledDowngrade).toBeFalsy();
});

test('extra units are sold only to active paid plans of the same family at the listed price', async () => {
  const unpaid = await workspace();
  expect((await topUp(unpaid, 'business_chat_300', 99000)).body.error).toMatchObject({ code: 'PAID_PLAN_REQUIRED' });
  const free = await workspace(true);
  expect((await topUp(free, 'personal_chat_100', 29000)).status).toBe(403);
  const pro = await workspace(true);
  const period = await activatePaidSubscription({
    orgId: pro.org.id,
    planCode: 'personal_pro',
    amount: 99000,
    action: 'purchase',
    paymentReference: randomUUID(),
  });
  expect((await topUp(pro, 'business_chat_300', 99000)).status).toBe(400);
  expect((await topUp(pro, 'personal_chat_100', 1000)).body.error).toMatchObject({ code: 'TOP_UP_PRICE_CHANGED' });
  await SubscriptionPeriodModel.updateOne(
    { _id: period._id },
    { $set: { endsAt: new Date(Date.now() + 10 * 60_000) } },
  );
  expect((await topUp(pro, 'personal_chat_100', 29000)).body.error).toMatchObject({ code: 'PERIOD_ENDING' });
  expect(await PaymentModel.countDocuments({ orgId: { $in: [unpaid.org.id, free.org.id, pro.org.id] } })).toBe(0);
});

test('upgrading keeps purchased units that were not used yet', async () => {
  const w = await workspace();
  const starter = await activatePaidSubscription({
    orgId: w.org.id,
    planCode: 'business_starter',
    amount: 499000,
    action: 'purchase',
    paymentReference: randomUUID(),
  });
  await activateTopUp({ orgId: w.org.id, packCode: 'business_analysis_50', amount: 199000, paymentReference: randomUUID() });
  // 200 plan units and 20 of the 50 purchased units are spent.
  await SubscriptionPeriodModel.updateOne({ _id: starter._id }, { $set: { analysisUsed: 220 } });
  const quote = await quotePlanCheckout(w.owner.id, w.org.id, 'business_pro');
  const upgraded = await activatePaidSubscription(
    { orgId: w.org.id, planCode: 'business_pro', amount: quote.amount, action: 'upgrade', paymentReference: randomUUID(), orderedAt: quote.quotedAt },
    quote.quotedAt,
  );
  expect(upgraded).toMatchObject({ analysisBonus: 30, chatBonus: 0, draftingBonus: 0 });
  expect((await getSubscription(w.owner.id, w.org.id)).analysis).toMatchObject({
    used: 0,
    limit: 630,
    bonus: 30,
    available: 630,
  });
});

const contractChat = (w, key = randomUUID()) => ({
  orgId: w.org.id,
  userId: w.owner.id,
  contractId: w.contract.id,
  kind: 'chat',
  idempotencyKey: key,
  payload: { message: 'Điều khoản này có rủi ro gì?' },
});

test('a paid contract review includes chat about that contract, spent before the plan quota', async () => {
  const w = await personalReview();
  const before = await reviewQuote(w);
  expect(before.body.data).toMatchObject({ includedChat: 20, contractChat: { allowance: 0, available: 0 } });
  await paidReview(w);
  expect((await reviewQuote(w)).body.data.contractChat).toMatchObject({ allowance: 20, used: 0, available: 20 });
  const planChat = async () => (await getSubscription(w.owner.id, w.org.id)).chat;
  const startingPlan = await planChat();

  const failed = await reserveUsage(contractChat(w));
  expect(failed.run.reviewPurchaseId).toBeTruthy();
  expect(failed.run.periodId).toBeFalsy();
  expect((await reviewQuote(w)).body.data.contractChat).toMatchObject({ reserved: 1, available: 19 });
  await finishUsage(w.org.id, failed.run.id, false);
  const ok = await reserveUsage(contractChat(w));
  await finishUsage(w.org.id, ok.run.id, true, { reply: 'ok' });
  expect((await reviewQuote(w)).body.data.contractChat).toMatchObject({ used: 1, reserved: 0, available: 19 });
  expect(await planChat()).toMatchObject({ used: startingPlan.used, reserved: 0 });

  // Once the included questions are spent, chat falls back to the plan quota.
  await ContractReviewPurchaseModel.updateOne({ orgId: w.org.id }, { $set: { chatUsed: 20 } });
  const fallback = await reserveUsage(contractChat(w));
  expect(fallback.run.reviewPurchaseId).toBeFalsy();
  expect(fallback.run.periodId).toBeTruthy();
  await finishUsage(w.org.id, fallback.run.id, true, { reply: 'ok' });
  expect(await planChat()).toMatchObject({ used: startingPlan.used + 1 });
});

test('included chat is restored when a lease expires and is not granted to purchases sold without it', async () => {
  const w = await personalReview();
  await paidReview(w);
  const { run } = await reserveUsage(contractChat(w));
  const { UsageRunModel } = require('../dist/models/subscription.model');
  await UsageRunModel.updateOne({ _id: run.id }, { $set: { leaseExpiresAt: new Date(Date.now() - 1000) } });
  await getSubscription(w.owner.id, w.org.id);
  expect((await ContractReviewPurchaseModel.findOne({ orgId: w.org.id })).toObject()).toMatchObject({ chatReserved: 0, chatUsed: 0 });

  const legacy = await personalReview();
  await paidReview(legacy);
  await ContractReviewPurchaseModel.collection.updateOne(
    { orgId: new mongoose.Types.ObjectId(legacy.org.id) },
    { $unset: { chatAllowance: '', chatUsed: '', chatReserved: '' } },
  );
  const planned = await reserveUsage(contractChat(legacy));
  expect(planned.run.reviewPurchaseId).toBeFalsy();
  expect(planned.run.periodId).toBeTruthy();
});


test('a longer new version is paid for by its extra units only, then reviewed with the earlier purchase', async () => {
  const w = await personalReview(8, 3); // 2 units, Free exhausted
  await paidReview(w);
  const longer = await ContractVersionModel.create({ contractId: w.contract.id, versionNumber: 2, createdBy: w.owner.id, extractionStatus: 'completed', extractionQuality: { method: 'text_layer', pageCount: 14, ocrPageCount: 0, lowConfidence: false } });
  const quote = (await reviewQuote(w)).body.data;
  expect(quote).toMatchObject({ versionId: longer.id, units: 3, paidUnits: 2, amount: 10000, canPurchase: true });
  const topUp = await purchaseReview(w, 10000, randomUUID(), longer.id);
  expect(topUp.status).toBe(201);
  paid(topUp.body.data.orderCode);
  expect((await webhook(await event(topUp.body.data.orderCode))).status).toBe(200);
  expect((await webhook(await event(topUp.body.data.orderCode))).status).toBe(200);
  const purchase = await ContractReviewPurchaseModel.findOne({ orgId: w.org.id });
  expect(purchase.toObject()).toMatchObject({ versionId: longer._id, units: 3, amount: 30000, status: 'available' });
  expect(await ContractReviewPurchaseModel.countDocuments({ orgId: w.org.id })).toBe(1);
  const { run } = await reserveUsage({ ...reviewUsage(w), versionId: longer.id });
  expect(run).toMatchObject({ units: 3 });
  expect(run.reviewPurchaseId.toString()).toBe(purchase.id);
  // Once reviewed, the contract can be deleted again.
  await finishUsage(w.org.id, run.id, true, { reviewed: true });
  expect((await request(app).delete(`/api/v1/contracts/${w.contract.id}`).set('Authorization', auth(w.owner))).status).toBe(204);
});

test('re-reviewing a contract reviewed with a paid purchase uses plan units after upgrading', async () => {
  const w = await personalReview();
  await paidReview(w);
  const { run } = await reserveUsage(reviewUsage(w));
  await finishUsage(w.org.id, run.id, true, { reviewed: true });
  await activatePaidSubscription({ orgId: w.org.id, planCode: 'personal_pro', amount: 99000, action: 'purchase', paymentReference: randomUUID() });
  const again = await reserveUsage(reviewUsage(w));
  expect(again.run.reviewPurchaseId).toBeFalsy();
  expect(again.run.periodId).toBeTruthy();
  expect((await getSubscription(w.owner.id, w.org.id)).analysis).toMatchObject({ reserved: 2, limit: 30 });
});

test('an abandoned order paid at the last moment is settled instead of replaced', async () => {
  const w = await workspace();
  const first = await create(w, 'business_starter');
  paid(first.body.data.orderCode);
  const second = await create(w, 'business_pro', 'purchase');
  expect(second.status).toBe(409);
  expect(second.body.error.code).toBe('PREVIOUS_ORDER_PAID');
  expect((await PaymentModel.findOne({ orderCode: first.body.data.orderCode })).fulfilledAt).toBeTruthy();
  expect(await PaymentModel.countDocuments({ orgId: w.org.id })).toBe(1);
  expect((await getSubscription(w.owner.id, w.org.id)).plan.code).toBe('business_starter');
});


test('a review uses the remaining Free units plus a paid shortfall, and failures refund both', async () => {
  const w = await personalReview(16, 0); // 4 units needed, 3 Free units left
  expect((await reviewQuote(w)).body.data).toMatchObject({ units: 4, planUnits: 3, shortfallUnits: 1, amount: 10000 });
  const order = await purchaseReview(w, 10000);
  expect(order.status).toBe(201);
  expect(order.body.data.reviewUnits).toBe(1);
  paid(order.body.data.orderCode);
  expect((await webhook(await event(order.body.data.orderCode))).status).toBe(200);
  expect((await reviewQuote(w)).body.data).toMatchObject({ purchaseStatus: 'available', paidUnits: 1, planUnits: 3, shortfallUnits: 0 });
  const analysis = async () => (await getSubscription(w.owner.id, w.org.id)).analysis;

  const failed = await reserveUsage(reviewUsage(w));
  expect(failed.run).toMatchObject({ units: 4, planUnits: 3 });
  expect(failed.run.reviewPurchaseId).toBeTruthy();
  expect(await analysis()).toMatchObject({ used: 0, reserved: 3, available: 0 });
  await finishUsage(w.org.id, failed.run.id, false);
  expect(await analysis()).toMatchObject({ used: 0, reserved: 0, available: 3 });
  expect((await reviewQuote(w)).body.data.purchaseStatus).toBe('available');

  const expired = await reserveUsage(reviewUsage(w));
  const { UsageRunModel } = require('../dist/models/subscription.model');
  await UsageRunModel.updateOne({ _id: expired.run.id }, { $set: { leaseExpiresAt: new Date(Date.now() - 1000) } });
  expect(await analysis()).toMatchObject({ reserved: 0, available: 3 });

  const ok = await reserveUsage(reviewUsage(w));
  await finishUsage(w.org.id, ok.run.id, true, { reviewed: true });
  expect(await analysis()).toMatchObject({ used: 3, reserved: 0, available: 0 });
  expect((await reviewQuote(w)).body.data.purchaseStatus).toBe('consumed');
});

test('a paid shortfall that the plan can no longer cover is topped up instead of stranded', async () => {
  const w = await personalReview(16, 0);
  const order = await purchaseReview(w, 10000);
  paid(order.body.data.orderCode);
  await webhook(await event(order.body.data.orderCode));
  // Free units spent elsewhere before the review started.
  const subscription = await getSubscription(w.owner.id, w.org.id);
  await SubscriptionPeriodModel.updateOne({ _id: subscription.periodId }, { $set: { analysisUsed: 2 } });
  await expect(reserveUsage(reviewUsage(w))).rejects.toMatchObject({ code: 'ANALYSIS_QUOTA_EXHAUSTED' });
  const quote = (await reviewQuote(w)).body.data;
  expect(quote).toMatchObject({ paidUnits: 1, planUnits: 1, shortfallUnits: 2, amount: 20000, canPurchase: true });
  const topUp = await purchaseReview(w, 20000);
  expect(topUp.status).toBe(201);
  paid(topUp.body.data.orderCode);
  await webhook(await event(topUp.body.data.orderCode));
  expect((await ContractReviewPurchaseModel.findOne({ orgId: w.org.id })).toObject()).toMatchObject({ units: 3, amount: 30000, status: 'available' });
  const { run } = await reserveUsage(reviewUsage(w));
  expect(run).toMatchObject({ units: 4, planUnits: 1 });
});
