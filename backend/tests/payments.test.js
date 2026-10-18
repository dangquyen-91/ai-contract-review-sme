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
const {
  SubscriptionPeriodModel,
  initializeSubscriptionModels,
} = require('../dist/models/subscription.model');
const {
  seedPlans,
  activatePaidSubscription,
  scheduleDowngrade,
} = require('../dist/services/billing/subscription.service');
const { seedDefaultRoles, getRoleByCode } = require('../dist/services/identity/role.service');
const { tokensForUser } = require('../dist/services/identity/auth.service');
const signer = new PayOS({
  clientId: 'test',
  apiKey: 'test',
  checksumKey: 'test-checksum',
  logLevel: 'off',
});
const remoteOrders = new Map();
let app, repl;

async function user(org, role = 'owner') {
  const roleDoc = await getRoleByCode(role);
  return (
    await UserModel.create({
      name: 'Payment user',
      email: `${randomUUID()}@example.com`,
      passwordHash: 'unused',
      emailVerifiedAt: new Date(),
      orgId: org._id,
      roleId: roleDoc._id,
    })
  ).populate('roleId');
}
async function workspace(personal = false) {
  const org = await OrganizationModel.create({ name: 'Payment workspace', isPersonal: personal });
  return { org, owner: await user(org, personal ? 'user' : 'owner') };
}
const auth = (u) => `Bearer ${tokensForUser(u).accessToken}`;
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

beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  await seedDefaultRoles();
  await initializeSubscriptionModels();
  await Promise.all([PaymentModel.init(), OrganizationModel.init(), UserModel.init()]);
  await seedPlans();
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
  expect((await create(w)).status).toBe(409);
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
  await UserModel.deleteMany({ _id: { $in: extra.map((u) => u._id) } });
  expect((await sync(w, code)).body.data.fulfilledAt).toBeTruthy();
  expect(await SubscriptionPeriodModel.countDocuments({ paymentReference: `payos:${code}` })).toBe(
    1,
  );
});

test('upgrade checkout leaves old period intact until paid, then starts a fresh full-price period', async () => {
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
  expect(response.body.data.amount).toBe(999000);
  expect((await SubscriptionPeriodModel.findById(old._id)).cancelledAt).toBeFalsy();
  paid(response.body.data.orderCode);
  await webhook(await event(response.body.data.orderCode));
  expect((await SubscriptionPeriodModel.findById(old._id)).cancelledAt).toBeTruthy();
  const period = await SubscriptionPeriodModel.findOne({
    paymentReference: `payos:${response.body.data.orderCode}`,
  });
  expect(period.startsAt.getTime()).toBeLessThan(old.endsAt.getTime());
});

test('renewal appends and a paid scheduled downgrade starts at next cycle', async () => {
  const w = await workspace();
  const old = await activatePaidSubscription({
    orgId: w.org.id,
    planCode: 'business_pro',
    amount: 999000,
    action: 'purchase',
    paymentReference: randomUUID(),
  });
  const renew = await create(w, 'business_pro', 'renew');
  paid(renew.body.data.orderCode);
  await webhook(await event(renew.body.data.orderCode));
  const renewed = await SubscriptionPeriodModel.findOne({
    paymentReference: `payos:${renew.body.data.orderCode}`,
  });
  expect(renewed.startsAt).toEqual(old.endsAt);
  expect((await create(w, 'business_starter', 'downgrade')).status).toBe(409);
  await scheduleDowngrade(w.owner.id, w.org.id, 'business_starter');
  const down = await create(w, 'business_starter', 'downgrade');
  expect(down.status).toBe(201);
  paid(down.body.data.orderCode);
  await webhook(await event(down.body.data.orderCode));
  const period = await SubscriptionPeriodModel.findOne({
    paymentReference: `payos:${down.body.data.orderCode}`,
  });
  expect(period.startsAt).toEqual(renewed.endsAt);
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
