process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'reports-test-access';
process.env.JWT_REFRESH_SECRET = 'reports-test-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.GEMINI_API_KEY = '';
process.env.MONGOMS_DOWNLOAD_DIR = require('path').join(
  __dirname,
  '../node_modules/.cache/mongodb-memory-server',
);

const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../dist/app');
const { logger } = require('../dist/config/logger');
logger.silent = true;
const { UserModel } = require('../dist/models/user.model');
const { ContractModel } = require('../dist/models/contract.model');
const { ReviewModel } = require('../dist/models/review.model');
const { PaymentModel } = require('../dist/models/payment.model');
const { OrganizationModel } = require('../dist/models/organization.model');
const { UsageRunModel } = require('../dist/models/subscription.model');
const { seedDefaultRoles, getRoleByCode } = require('../dist/services/identity/role.service');
const { tokensForUser } = require('../dist/services/identity/auth.service');
const { getReports, getComparedReports } = require('../dist/services/reporting/reports.service');
const { percentage, reportWindow } = require('../dist/services/reporting/reportFormulas');
const { reviewCost } = require('../dist/services/billing/reviewCost');
const { readUsageCounter } = require('../dist/services/billing/usagePolicy');

const now = new Date('2026-11-10T03:00:00Z');
const inside = new Date('2026-11-10T02:00:00Z');
const start = new Date('2026-11-09T17:00:00Z');
const end = new Date('2026-11-10T17:00:00Z');
const outside = new Date('2026-11-09T16:59:59.999Z');
const id = () => new mongoose.Types.ObjectId();
let mongo,
  app,
  serial = 0;
async function account(role, orgId) {
  return (
    await UserModel.create({
      name: role,
      email: `report-${++serial}@example.com`,
      roleId: (await getRoleByCode(role))._id,
      orgId,
      passwordHash: 'unused',
      isActive: true,
      emailVerifiedAt: now,
    })
  ).populate('roleId');
}
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await seedDefaultRoles();
  await Promise.all([
    UserModel.init(),
    ContractModel.init(),
    ReviewModel.init(),
    OrganizationModel.init(),
    PaymentModel.init(),
    UsageRunModel.init(),
  ]);
  app = createApp();
});
beforeEach(async () => {
  await Promise.all([
    UserModel.deleteMany({}),
    ContractModel.deleteMany({}),
    ReviewModel.deleteMany({}),
    OrganizationModel.deleteMany({}),
    PaymentModel.deleteMany({}),
    UsageRunModel.deleteMany({}),
  ]);
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test('ratios preserve precision, empty denominators are unknown, and Vietnam day boundaries are half-open', () => {
  expect(percentage(1, 3)).toBeCloseTo(33.3333333);
  expect(percentage(0, 5)).toBe(0);
  expect(percentage(0, 0)).toBeNull();
  expect(() => percentage(NaN, 1)).toThrow(RangeError);
  expect(() => percentage(1, -1)).toThrow(RangeError);
  const window = reportWindow(1, now);
  expect(window.from).toEqual(start);
  expect(window.to).toEqual(end);
  expect(window.dates).toEqual(['2026-11-10']);
  expect(reportWindow(1, new Date('2026-11-10T17:00:00Z')).dates).toEqual(['2026-11-11']);
  expect(reportWindow(7, now).dates).toHaveLength(7);
  expect(() => reportWindow(91, now)).toThrow();
  expect(
    reviewCost({ extractionStatus: 'completed', extractionQuality: { pageCount: 6 } }).units,
  ).toBe(2);
  expect(
    readUsageCounter(
      { plan: { analysisLimit: 10 }, analysisUsed: 3, analysisReserved: 2 },
      'analysis',
    ).available,
  ).toBe(5);
});

test('reports count attempts separately from unique latest-risk contracts, paid receipts and committed billing units', async () => {
  const org = await OrganizationModel.create({ name: 'Reports company' });
  const orgId = org._id;
  const a = id(),
    b = id(),
    c = id(),
    d = id();
  await ContractModel.collection.insertMany([
    { _id: a, orgId, title: 'Old upload', createdAt: outside },
    { _id: b, orgId, title: 'First second', createdAt: start },
    { _id: c, orgId, title: 'Last second', createdAt: new Date(end.getTime() - 1) },
    { _id: d, orgId, title: 'Tomorrow', createdAt: end },
  ]);
  function review(contractId, status, finishedAt, risk, duration) {
    return {
      _id: id(),
      orgId,
      contractId,
      idempotencyKey: String(id()),
      status,
      finishedAt,
      createdAt: start,
      ...(duration === undefined ? {} : { startedAt: new Date(finishedAt.getTime() - duration) }),
      ...(risk ? { result: { overallRiskLevel: risk } } : {}),
    };
  }
  await ReviewModel.collection.insertMany([
    review(a, 'completed', start, 'high', 30_000),
    review(a, 'completed', inside, 'low', 60_000),
    review(b, 'completed', inside, 'none', 90_000),
    review(c, 'completed', inside, 'high'),
    review(d, 'completed', inside, undefined, -1000),
    review(a, 'failed', inside),
    review(b, 'cancelled', inside),
    review(b, 'completed', outside, 'high', 1000),
    review(a, 'completed', end, 'high', 1000),
    { _id: id(), orgId, idempotencyKey: 'queued', status: 'queued', createdAt: start },
    { _id: id(), orgId, idempotencyKey: 'running', status: 'running', createdAt: inside },
  ]);
  await PaymentModel.collection.insertMany(
    [
      {
        orgId,
        status: 'paid',
        currency: 'VND',
        amount: 99_000,
        paidAt: start,
        fulfilledAt: inside,
        createdAt: outside,
      },
      { orgId, status: 'paid', currency: 'VND', amount: 10_000, paidAt: inside },
      { orgId, status: 'pending', currency: 'VND', amount: 999_000, paidAt: inside },
      { orgId, status: 'cancelled', currency: 'VND', amount: 999_000, paidAt: inside },
      { orgId, status: 'paid', currency: 'VND', amount: 999_000, paidAt: end },
    ].map((row, index) => ({
      ...row,
      orderCode: index + 1,
      idempotencyKey: `report-payment-${index}`,
      isOpen: false,
    })),
  );
  await UsageRunModel.collection.insertMany(
    [
      { orgId, status: 'succeeded', kind: 'analysis', units: 3, updatedAt: inside },
      { orgId, status: 'succeeded', kind: 'chat', units: 2, updatedAt: inside },
      { orgId, status: 'succeeded', kind: 'drafting', units: 1, updatedAt: inside },
      { orgId, status: 'failed', kind: 'analysis', units: 9, updatedAt: inside },
      { orgId, status: 'reserved', kind: 'analysis', units: 9, updatedAt: inside },
      { orgId, status: 'succeeded', kind: 'analysis', units: 9, updatedAt: end },
    ].map((row, index) => ({ ...row, idempotencyKey: `report-usage-${index}` })),
  );
  const report = await getReports({ role: 'administrator', sub: String(id()) }, 1, undefined, now);
  expect(report.uploadedContracts).toBe(2);
  expect(report.reviews).toMatchObject({
    completed: 5,
    failed: 1,
    cancelled: 1,
    finished: 6,
    queued: 1,
    running: 1,
    timedReviews: 3,
    averageDurationMs: 60_000,
  });
  expect(report.reviews.successRate).toBeCloseTo((5 / 6) * 100);
  expect(report.risks).toMatchObject({
    high: 1,
    low: 1,
    none: 1,
    unknown: 1,
    assessedContracts: 3,
  });
  expect(report.risks.highRiskRate).toBeCloseTo(100 / 3);
  expect(report.payments).toMatchObject({ amount: 109_000, count: 2, unfulfilled: 1 });
  expect(report.consumedUnits).toEqual({ analysis: 3, chat: 2, drafting: 1 });
  expect(report.daily).toEqual([{ date: '2026-11-10', completed: 5, failed: 1 }]);
  expect(report.usage[0]).toMatchObject({ name: org.name, total: 6 });
  const calendar = await getComparedReports(
    { role: 'administrator', sub: String(id()) },
    {
      period: 'custom',
      start: '2026-11-10',
      end: '2026-11-10',
      comparison: 'previous',
      granularity: 'day',
    },
    end,
  );
  const day = calendar.trend.buckets[0].current;
  expect(day).toMatchObject({
    uploads: 2,
    completed: 5,
    failed: 1,
    cancelled: 1,
    receivedAmount: 109000,
    analysis: 3,
    chat: 2,
    drafting: 1,
    averageDurationMs: 60000,
  });
  expect(calendar.comparison.changes.payments.current).toBe(calendar.payments.amount);
  expect(calendar.comparison.changes.payments.status).toBe('no_baseline');
  expect(calendar.risks.percentages.none).toBeCloseTo(100 / 3);
});

test('Owner is isolated from other organizations and system receipts, and empty periods never invent ratios', async () => {
  const own = await OrganizationModel.create({ name: 'Own' });
  const other = await OrganizationModel.create({ name: 'Other' });
  await ContractModel.collection.insertOne({ orgId: other._id, createdAt: inside });
  const owner = { sub: String(id()), role: 'owner', orgId: own.id };
  const report = await getReports(owner, 1, undefined, now);
  expect(report.uploadedContracts).toBe(0);
  expect(report.reviews.successRate).toBeNull();
  expect(report.reviews.averageDurationMs).toBeNull();
  expect(report.risks.highRiskRate).toBeNull();
  expect(report.payments).toBeNull();
  expect(report.organizations.map((org) => org.id)).toEqual([own.id]);
  await expect(getReports(owner, 1, other.id, now)).rejects.toMatchObject({ statusCode: 403 });
});

test('report endpoint rejects Staff, User, Manager and Expert and validates query boundaries', async () => {
  for (const role of ['staff', 'user', 'manager', 'expert']) {
    const user = await account(role);
    expect(
      (
        await request(app)
          .get('/api/v1/reports')
          .set('Authorization', `Bearer ${tokensForUser(user).accessToken}`)
      ).status,
    ).toBe(403);
  }
  const admin = await account('administrator');
  const auth = `Bearer ${tokensForUser(admin).accessToken}`;
  expect(
    (await request(app).get('/api/v1/reports?days=91').set('Authorization', auth)).status,
  ).toBe(400);
  expect(
    (await request(app).get('/api/v1/reports?organizationId=bad').set('Authorization', auth))
      .status,
  ).toBe(400);
  const response = await request(app).get('/api/v1/reports?days=7').set('Authorization', auth);
  expect(response.status).toBe(200);
  expect(response.headers['cache-control']).toContain('no-store');
  expect(response.body.data.daily).toHaveLength(7);
  for (const query of [
    'period=custom',
    'period=month&anchor=2026-02-30',
    'period=year&days=7',
    'period=week&comparison=invalid',
    'period=month&start=2026-01-01',
    'period=custom&start=2025-01-01&end=2026-11-01',
  ]) {
    expect(
      (await request(app).get(`/api/v1/reports?${query}`).set('Authorization', auth)).status,
    ).toBe(400);
  }
  const calendar = await request(app)
    .get('/api/v1/reports?period=month&anchor=2025-10-01&comparison=year&granularity=week')
    .set('Authorization', auth);
  expect(calendar.status).toBe(200);
  expect(calendar.body.data.period.startDate).toBe('2025-10-01');
  expect(calendar.body.data.comparison.period.startDate).toBe('2024-10-01');
  expect(calendar.body.data.trend.granularity).toBe('week');
});

test('calendar reports aggregate both periods on the server and isolate Owner scope in comparisons', async () => {
  const org = await OrganizationModel.create({ name: 'Calendar org' });
  const other = await OrganizationModel.create({ name: 'Other calendar org' });
  const current = new Date('2026-11-10T02:00:00Z');
  const previous = new Date('2026-10-09T02:00:00Z');
  await ContractModel.collection.insertMany([
    { orgId: org._id, createdAt: current },
    { orgId: org._id, createdAt: current },
    { orgId: org._id, createdAt: previous },
    { orgId: other._id, createdAt: previous },
    { orgId: org._id, createdAt: now }, // The half-open current endpoint is excluded.
  ]);
  const owner = { sub: String(id()), role: 'owner', orgId: org.id };
  const filters = {
    period: 'month',
    anchor: '2026-11-10',
    comparison: 'previous',
    granularity: 'week',
  };
  const report = await getComparedReports(owner, filters, now);
  expect(report.uploadedContracts).toBe(2);
  expect(report.comparison.changes.uploads).toMatchObject({
    current: 2,
    previous: 1,
    difference: 1,
    changePercent: 100,
  });
  expect(report.trend.buckets.reduce((sum, row) => sum + (row.current?.uploads ?? 0), 0)).toBe(2);
  expect(report.trend.buckets.reduce((sum, row) => sum + (row.previous?.uploads ?? 0), 0)).toBe(1);
  expect(report.payments).toBeNull();
  expect(report.comparison.changes.payments.status).toBe('no_data');
  expect(
    report.trend.buckets.every((row) => !row.current || row.current.receivedAmount === null),
  ).toBe(true);
  await expect(
    getComparedReports(owner, { ...filters, organizationId: other.id }, now),
  ).rejects.toMatchObject({ statusCode: 403 });
  const noComparison = await getComparedReports(owner, { ...filters, comparison: 'none' }, now);
  expect(noComparison.comparison.period).toBeNull();
  expect(noComparison.trend.buckets.every((row) => row.previous === null)).toBe(true);
});
