process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'subscription-test-access';
process.env.JWT_REFRESH_SECRET = 'subscription-test-refresh';
process.env.GEMINI_API_KEY = '';
process.env.MONGOMS_DOWNLOAD_DIR = require('path').join(
  __dirname,
  '../node_modules/.cache/mongodb-memory-server',
);

jest.mock('../dist/services/invitationEmail.service', () => ({
  ensureInvitationEmailConfigured: jest.fn(),
  sendInvitationEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../dist/services/clause.service', () => ({
  segmentClauses: jest.fn().mockResolvedValue([]),
  listClauses: jest.fn(),
}));
jest.mock('../dist/services/summary.service', () => ({
  generateContractSummary: jest.fn().mockResolvedValue({}),
}));
jest.mock('../dist/services/risk.service', () => ({
  detectRisks: jest.fn().mockResolvedValue([]),
  listRiskFindings: jest.fn(),
  updateProposedRevision: jest.fn(),
  removeProposedRevision: jest.fn(),
}));
jest.mock('../dist/services/llm.service', () => ({
  generateText: jest.fn().mockResolvedValue('Test AI reply'),
  generateTextStream: jest.fn(async function* () {
    yield 'Test ';
    yield 'AI reply';
  }),
}));

const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const request = require('supertest');
const { randomUUID } = require('crypto');
const { createApp } = require('../dist/app');
const { logger } = require('../dist/config/logger');
logger.silent = true;
const { OrganizationModel } = require('../dist/models/organization.model');
const { UserModel } = require('../dist/models/user.model');
const { ContractModel } = require('../dist/models/contract.model');
const { ContractVersionModel } = require('../dist/models/contractVersion.model');
const { ChatMessageModel } = require('../dist/models/chatMessage.model');
const { seedDefaultRoles, getRoleByCode } = require('../dist/services/role.service');
const { tokensForUser } = require('../dist/services/auth.service');
const {
  PlanModel,
  SubscriptionPeriodModel,
  UsageRunModel,
  initializeSubscriptionModels,
} = require('../dist/models/subscription.model');
const {
  seedPlans,
  getSubscription,
  resolveSubscription,
  lockSubscriptionOrganization,
  activatePaidSubscription,
  scheduleDowngrade,
  cancelDowngrade,
} = require('../dist/services/subscription.service');
const { reserveUsage, finishUsage, withUsage } = require('../dist/services/usage.service');
const { vietnamCalendarMonth, addSubscriptionMonth } = require('../dist/utils/subscriptionPeriods');
const invitations = require('../dist/services/invitation.service');
const { sendInvitationEmail } = require('../dist/services/invitationEmail.service');
const { OrganizationInvitationModel } = require('../dist/models/organizationInvitation.model');
const { generateContractSummary } = require('../dist/services/summary.service');
const { generateText, generateTextStream } = require('../dist/services/llm.service');
const { segmentClauses } = require('../dist/services/clause.service');

let repl,
  app,
  serial = 0;
async function user(role = 'user', orgId) {
  const roleDoc = await getRoleByCode(role);
  return (
    await UserModel.create({
      name: 'Test',
      email: `sub-${++serial}@example.com`,
      passwordHash: 'unused',
      roleId: roleDoc._id,
      orgId,
    })
  ).populate('roleId');
}
async function workspace(personal = false) {
  const org = await OrganizationModel.create({ name: 'Workspace', isPersonal: personal });
  const owner = await user(personal ? 'user' : 'owner', org._id);
  const contract = await ContractModel.create({
    title: 'Test contract',
    type: 'service',
    orgId: org._id,
    uploadedBy: owner._id,
  });
  await ContractVersionModel.create({
    contractId: contract._id,
    versionNumber: 1,
    createdBy: owner._id,
    extractionStatus: 'completed',
    extractedText: 'A valid contract for analysis',
    segmentationStatus: 'completed',
  });
  return { org, owner, contract };
}
const bearer = (u) => `Bearer ${tokensForUser(u).accessToken}`;
const usage = (w, kind = 'analysis', key = randomUUID()) => ({
  orgId: w.org.id,
  userId: w.owner.id,
  contractId: w.contract.id,
  kind,
  idempotencyKey: key,
  payload: { message: 'hello' },
});
async function pay(w, planCode, action = 'purchase', reference = randomUUID(), now) {
  const plan = await PlanModel.findOne({ code: planCode });
  return activatePaidSubscription(
    { orgId: w.org.id, planCode, action, amount: plan.price, paymentReference: reference },
    now,
  );
}
async function stateAt(w, now) {
  return mongoose.connection.transaction(async (session) => {
    await lockSubscriptionOrganization(w.org.id, session);
    return resolveSubscription(w.org.id, session, now);
  });
}
beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  await seedDefaultRoles();
  await initializeSubscriptionModels();
  await Promise.all([
    OrganizationModel.init(),
    UserModel.init(),
    OrganizationInvitationModel.init(),
    ContractModel.init(),
    ContractVersionModel.init(),
    ChatMessageModel.init(),
  ]);
  await seedPlans();
  app = createApp();
});
afterAll(async () => {
  await mongoose.disconnect();
  if (repl) await repl.stop();
});

test('catalog is exact and seeding does not duplicate plans', async () => {
  await seedPlans();
  const response = await request(app).get('/api/v1/plans');
  expect(response.status).toBe(200);
  expect(
    response.body.data.map((p) => [p.price, p.analysisLimit, p.chatLimit, p.memberLimit]),
  ).toEqual([
    [0, 3, 10, 1],
    [99000, 30, 200, 1],
    [499000, 200, 500, 5],
    [999000, 600, 1500, 15],
  ]);
});

test('calendar reset is exactly Vietnam midnight and calendar months clamp end-of-month', () => {
  expect(vietnamCalendarMonth(new Date('2026-10-31T16:59:59Z')).endsAt.toISOString()).toBe(
    '2026-10-31T17:00:00.000Z',
  );
  expect(vietnamCalendarMonth(new Date('2026-10-31T17:00:00Z')).startsAt.toISOString()).toBe(
    '2026-10-31T17:00:00.000Z',
  );
  expect(addSubscriptionMonth(new Date('2027-01-30T17:00:00Z')).toISOString()).toBe(
    '2027-02-27T17:00:00.000Z',
  );
  expect(addSubscriptionMonth(new Date('2028-01-30T17:00:00Z')).toISOString()).toBe(
    '2028-02-28T17:00:00.000Z',
  );
});

test('free usage resets at calendar boundary without rollover', async () => {
  const w = await workspace(true);
  const first = await stateAt(w, new Date('2026-10-20T00:00:00Z'));
  await SubscriptionPeriodModel.updateOne(
    { _id: first.period._id },
    { $set: { analysisUsed: 2, chatUsed: 9 } },
  );
  const next = await stateAt(w, new Date('2026-10-31T17:00:00Z'));
  expect(next.period.id).not.toBe(first.period.id);
  expect(next.period.analysisUsed).toBe(0);
  expect(next.period.plan.analysisLimit).toBe(3);
  expect(next.period.chatUsed).toBe(0);
});

test('unpaid business blocks AI and invitations but can read subscription and contracts', async () => {
  const w = await workspace();
  const sub = await getSubscription(w.owner.id, w.org.id);
  expect(sub.status).toBe('unsubscribed');
  expect(sub.members).toMatchObject({ count: 1, limit: 1, available: 0 });
  await expect(reserveUsage(usage(w))).rejects.toMatchObject({ statusCode: 403 });
  await expect(
    invitations.createInvitation(w.owner.id, w.org.id, {
      email: 'unpaid@example.com',
      role: 'staff',
    }),
  ).rejects.toMatchObject({ statusCode: 403 });
  const response = await request(app)
    .get(`/api/v1/contracts/${w.contract.id}`)
    .set('Authorization', bearer(w.owner));
  expect(response.status).toBe(200);
});

test('owner-only changes and cross-organization reads are blocked', async () => {
  const w = await workspace();
  const other = await workspace();
  await pay(w, 'business_pro');
  const staff = await user('staff', w.org._id);
  expect(
    (
      await request(app)
        .get(`/api/v1/organizations/${w.org.id}/subscription`)
        .set('Authorization', bearer(staff))
    ).status,
  ).toBe(200);
  expect(
    (
      await request(app)
        .get(`/api/v1/organizations/${w.org.id}/subscription`)
        .set('Authorization', bearer(other.owner))
    ).status,
  ).toBe(403);
  expect(
    (
      await request(app)
        .post(`/api/v1/organizations/${w.org.id}/subscription/downgrade`)
        .set('Authorization', bearer(staff))
        .send({ planCode: 'business_starter' })
    ).status,
  ).toBe(403);
});

test('renewal adds a future period without resetting current quota; duplicate settlement is idempotent', async () => {
  const w = await workspace();
  const current = await pay(w, 'business_starter');
  await SubscriptionPeriodModel.updateOne({ _id: current._id }, { $set: { analysisUsed: 17 } });
  const ref = randomUUID();
  const renewal = await pay(w, 'business_starter', 'renew', ref);
  const again = await pay(w, 'business_starter', 'renew', ref);
  expect(again.id).toBe(renewal.id);
  expect(renewal.startsAt).toEqual(current.endsAt);
  expect((await getSubscription(w.owner.id, w.org.id)).analysis.used).toBe(17);
  const next = await stateAt(w, renewal.startsAt);
  expect(next.period.id).toBe(renewal.id);
  expect(next.period.analysisUsed).toBe(0);
});

test('upgrade charges full price and starts fresh immediately, cancelling old prepaid benefits', async () => {
  const w = await workspace();
  const old = await pay(w, 'business_starter');
  const prepaid = await pay(w, 'business_starter', 'renew');
  await SubscriptionPeriodModel.updateOne({ _id: old._id }, { $set: { analysisUsed: 99 } });
  const upgraded = await pay(w, 'business_pro', 'upgrade');
  expect(upgraded.plan.price).toBe(999000);
  expect(upgraded.analysisUsed).toBe(0);
  expect(upgraded.endsAt).toEqual(addSubscriptionMonth(upgraded.startsAt));
  expect((await SubscriptionPeriodModel.findById(old.id)).cancelledAt).toBeTruthy();
  expect((await SubscriptionPeriodModel.findById(prepaid.id)).cancelledAt).toBeTruthy();
  expect((await getSubscription(w.owner.id, w.org.id)).plan.code).toBe('business_pro');
});

test('wrong price, wrong family and reused payment reference are rejected', async () => {
  const w = await workspace();
  await expect(
    activatePaidSubscription({
      orgId: w.org.id,
      planCode: 'business_pro',
      amount: 1,
      action: 'purchase',
      paymentReference: randomUUID(),
    }),
  ).rejects.toMatchObject({ statusCode: 400 });
  await expect(pay(w, 'personal_pro')).rejects.toMatchObject({ statusCode: 400 });
  const ref = randomUUID();
  await pay(w, 'business_starter', 'purchase', ref);
  const other = await workspace();
  await expect(pay(other, 'business_starter', 'purchase', ref)).rejects.toMatchObject({
    statusCode: 409,
  });
});

test('downgrade requires member count to fit and constrains future invitations until cancellation', async () => {
  const w = await workspace();
  await pay(w, 'business_pro');
  const staff = [];
  for (let i = 0; i < 5; i++) staff.push(await user('staff', w.org._id));
  await expect(scheduleDowngrade(w.owner.id, w.org.id, 'business_starter')).rejects.toMatchObject({
    statusCode: 409,
  });
  await UserModel.deleteOne({ _id: staff[0]._id });
  await scheduleDowngrade(w.owner.id, w.org.id, 'business_starter');
  await expect(
    invitations.createInvitation(w.owner.id, w.org.id, {
      email: 'full@example.com',
      role: 'staff',
    }),
  ).rejects.toMatchObject({ statusCode: 403 });
  await cancelDowngrade(w.owner.id, w.org.id);
  expect((await getSubscription(w.owner.id, w.org.id)).members.limit).toBe(15);
});

test('paid downgrade waits for boundary and cannot be cancelled once funded', async () => {
  const w = await workspace();
  const old = await pay(w, 'business_pro');
  await scheduleDowngrade(w.owner.id, w.org.id, 'business_starter');
  const lower = await pay(w, 'business_starter', 'downgrade');
  expect(lower.startsAt).toEqual(old.endsAt);
  expect((await getSubscription(w.owner.id, w.org.id)).plan.code).toBe('business_pro');
  await expect(cancelDowngrade(w.owner.id, w.org.id)).rejects.toMatchObject({ statusCode: 409 });
  await expect(scheduleDowngrade(w.owner.id, w.org.id, 'business_starter')).rejects.toMatchObject({
    statusCode: 409,
  });
  expect((await stateAt(w, old.endsAt)).period.plan.code).toBe('business_starter');
});

test('expired business retains members and data but has no AI allowance', async () => {
  const w = await workspace();
  const old = await pay(w, 'business_starter');
  await user('staff', w.org._id);
  await SubscriptionPeriodModel.updateOne(
    { _id: old._id },
    { $set: { endsAt: new Date(Date.now() - 1000) } },
  );
  const state = await getSubscription(w.owner.id, w.org.id);
  expect(state.status).toBe('expired');
  expect(state.members.count).toBe(2);
  expect(state.analysis.available).toBe(0);
  await expect(reserveUsage(usage(w, 'chat'))).rejects.toMatchObject({ statusCode: 403 });
  expect(await ContractModel.exists({ _id: w.contract._id })).toBeTruthy();
});

test('recreating a personal workspace does not reset account free credits in the same month', async () => {
  const w = await workspace(true);
  await withUsage(usage(w), async () => ({ success: true }));
  const replacement = await OrganizationModel.create({
    name: 'New personal workspace',
    isPersonal: true,
  });
  await UserModel.updateOne({ _id: w.owner._id }, { $set: { orgId: replacement._id } });
  expect((await getSubscription(w.owner.id, replacement.id)).analysis.used).toBe(1);
});

test('pending invitations do not reserve seats; simultaneous acceptance only fills final seat', async () => {
  const w = await workspace();
  await pay(w, 'business_starter');
  for (let i = 0; i < 3; i++) await user('staff', w.org._id);
  const a = await user();
  const b = await user();
  const tokens = [];
  for (const member of [a, b]) {
    await invitations.createInvitation(w.owner.id, w.org.id, {
      email: member.email,
      role: 'staff',
    });
    tokens.push(sendInvitationEmail.mock.calls.at(-1)[0].token);
  }
  const results = await Promise.allSettled([
    invitations.acceptInvitation(a.id, tokens[0]),
    invitations.acceptInvitation(b.id, tokens[1]),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(await UserModel.countDocuments({ orgId: w.org._id })).toBe(5);
});

test('concurrent final chat credit permits only one reservation across organization members', async () => {
  const w = await workspace();
  const period = await pay(w, 'business_starter');
  const staff = await user('staff', w.org._id);
  await SubscriptionPeriodModel.updateOne({ _id: period._id }, { $set: { chatUsed: 499 } });
  const results = await Promise.allSettled([
    reserveUsage(usage(w, 'chat')),
    reserveUsage({ ...usage(w, 'chat'), userId: staff.id }),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  const winner = results.find((r) => r.status === 'fulfilled').value;
  await finishUsage(w.org.id, winner.run.id, true, { reply: 'ok' });
  await finishUsage(w.org.id, winner.run.id, true, { reply: 'ok' });
  const saved = await SubscriptionPeriodModel.findById(period.id);
  expect(saved.chatUsed).toBe(500);
  expect(saved.chatReserved).toBe(0);
  expect(saved.analysisUsed).toBe(0);
});

test('errors and stale workers release quota, aborted-before-start calls reserve nothing', async () => {
  const w = await workspace(true);
  await expect(
    withUsage(usage(w), async () => {
      throw new Error('AI failure');
    }),
  ).rejects.toThrow('AI failure');
  let sub = await getSubscription(w.owner.id, w.org.id);
  expect(sub.analysis).toMatchObject({ used: 0, reserved: 0, available: 3 });
  const stale = await reserveUsage(usage(w));
  await UsageRunModel.updateOne({ _id: stale.run._id }, { $set: { leaseExpiresAt: new Date(0) } });
  sub = await getSubscription(w.owner.id, w.org.id);
  expect(sub.analysis.reserved).toBe(0);
  expect((await UsageRunModel.findById(stale.run.id)).status).toBe('failed');
  const controller = new AbortController();
  controller.abort();
  const before = await UsageRunModel.countDocuments({ orgId: w.org._id });
  await expect(withUsage(usage(w), async () => ({}), controller.signal)).rejects.toBeTruthy();
  expect(await UsageRunModel.countDocuments({ orgId: w.org._id })).toBe(before);
});

test('idempotency replays success without new charge and rejects mismatched input', async () => {
  const w = await workspace(true);
  const input = usage(w);
  const work = jest.fn().mockResolvedValue({ completed: true });
  const first = await withUsage(input, work);
  const again = await withUsage(input, work);
  expect(first.replayed).toBe(false);
  expect(again.replayed).toBe(true);
  expect(work).toHaveBeenCalledTimes(1);
  expect((await getSubscription(w.owner.id, w.org.id)).analysis.used).toBe(1);
  await expect(withUsage({ ...input, payload: { different: true } }, work)).rejects.toMatchObject({
    statusCode: 409,
  });
});

test('full analysis counts one credit, retry replays, failed summary refunds and old endpoints cannot bypass quota', async () => {
  const w = await workspace(true);
  const key = randomUUID();
  const analyze = (k) =>
    request(app)
      .post(`/api/v1/contracts/${w.contract.id}/analysis`)
      .set('Authorization', bearer(w.owner))
      .set('Idempotency-Key', k)
      .send({ analysisFocus: 'payment' });
  expect((await analyze(key)).status).toBe(200);
  expect((await analyze(key)).body.data.replayed).toBe(true);
  expect(segmentClauses).toHaveBeenCalledTimes(1);
  expect((await getSubscription(w.owner.id, w.org.id)).analysis.used).toBe(1);
  generateContractSummary.mockRejectedValueOnce(new Error('AI summary failed'));
  expect((await analyze(randomUUID())).status).toBe(500);
  expect((await getSubscription(w.owner.id, w.org.id)).analysis).toMatchObject({
    used: 1,
    reserved: 0,
  });
  for (const path of ['clauses/segment', 'summary', 'risks/detect', 'risks/detect/stream']) {
    const response = await request(app)
      .post(`/api/v1/contracts/${w.contract.id}/${path}`)
      .set('Authorization', bearer(w.owner))
      .send({});
    expect([403, 410]).toContain(response.status);
  }
});

test('personal users can chat; sync and streaming share quota; failed stream is not charged', async () => {
  const w = await workspace(true);
  const send = (stream = false) =>
    request(app)
      .post(`/api/v1/contracts/${w.contract.id}/chat${stream ? '/stream' : ''}`)
      .set('Authorization', bearer(w.owner))
      .set('Idempotency-Key', randomUUID())
      .send({ message: 'Explain contract' });
  expect((await send()).status).toBe(200);
  expect(generateText).toHaveBeenCalledTimes(1);
  const streamed = await send(true);
  expect(streamed.text).toContain('event: done');
  generateTextStream.mockImplementationOnce(async function* () {
    yield 'partial';
    throw new Error('AI failed');
  });
  expect((await send(true)).text).toContain('event: error');
  expect((await getSubscription(w.owner.id, w.org.id)).chat).toMatchObject({
    used: 2,
    reserved: 0,
  });
  expect(await ChatMessageModel.countDocuments({ orgId: w.org._id })).toBe(4);
});
