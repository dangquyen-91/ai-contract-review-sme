process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'dashboard-insights-test';
process.env.JWT_REFRESH_SECRET = 'dashboard-insights-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.MONGOMS_DOWNLOAD_DIR = require('path').join(
  __dirname,
  '../node_modules/.cache/mongodb-memory-server',
);

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../dist/app');
require('../dist/config/logger').logger.silent = true;
const { getDashboardInsights } = require('../dist/services/reporting/dashboard.service');
const { ContractModel } = require('../dist/models/contract.model');
const { ReviewModel } = require('../dist/models/review.model');
const { ExpertReviewModel } = require('../dist/models/expertReview.model');
const { ExpertWorkRecordModel } = require('../dist/models/expertWorkRecord.model');
const { LegalSourceModel } = require('../dist/models/legalSource.model');
const { OrganizationModel } = require('../dist/models/organization.model');
const { UserModel } = require('../dist/models/user.model');
const { MembershipModel } = require('../dist/models/membership.model');
const { PaymentModel } = require('../dist/models/payment.model');
const { UsageRunModel } = require('../dist/models/subscription.model');
const id = () => new mongoose.Types.ObjectId();
const now = new Date('2026-11-15T05:00:00Z');
const inside = new Date('2026-11-10T02:00:00Z');
const start = new Date('2026-10-31T17:00:00Z');
const query = { period: 'month' };
let mongo, app;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp();
});
beforeEach(async () => {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})),
  );
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test('staff sees the organization, personal workspace sees only the actor, and period boundaries are half-open', async () => {
  const org = id(),
    other = id(),
    user = id();
  await ContractModel.collection.insertMany([
    { orgId: org, title: 'Team A', status: 'processing', createdAt: start },
    { orgId: org, title: 'Team B', status: 'reviewed', createdAt: inside },
    { orgId: org, title: 'Old', status: 'archived', createdAt: new Date(start - 1) },
    { orgId: org, title: 'Future', status: 'uploaded', createdAt: now },
    { orgId: other, title: 'Other company', status: 'reviewed', createdAt: inside },
    { orgId: user, title: 'My personal', status: 'reviewed', createdAt: inside },
  ]);
  await ReviewModel.collection.insertMany([
    { orgId: org, status: 'completed', finishedAt: inside },
    { orgId: org, status: 'failed', finishedAt: inside },
    { orgId: other, status: 'completed', finishedAt: inside },
    { orgId: user, status: 'completed', finishedAt: inside },
  ]);
  await UsageRunModel.collection.insertMany([
    { orgId: org, status: 'succeeded', kind: 'analysis', units: 2, updatedAt: inside },
    { orgId: org, status: 'reserved', kind: 'analysis', units: 8, updatedAt: inside },
    { orgId: other, status: 'succeeded', kind: 'analysis', units: 20, updatedAt: inside },
  ]);
  const staff = await getDashboardInsights(
    { sub: String(user), role: 'staff', orgId: String(org) },
    query,
    now,
  );
  expect(staff.scope).toEqual({ type: 'organization', id: String(org) });
  expect(staff.metrics).toMatchObject({
    contracts: 4,
    uploads: 2,
    completed: 1,
    failed: 1,
    analysisUnits: 2,
    processing: 1,
  });
  expect(staff.trend.reduce((sum, row) => sum + row.uploads, 0)).toBe(2);
  expect(staff.period.startDate).toBe('2026-11-01');
  expect(staff.period.toExclusive).toBe(now.toISOString());
  const personal = await getDashboardInsights(
    { sub: String(user), role: 'user', workspace: 'personal' },
    query,
    now,
  );
  expect(personal.scope).toEqual({ type: 'personal', id: String(user) });
  expect(personal.metrics).toMatchObject({ contracts: 1, uploads: 1, completed: 1, failed: 0 });
  expect(personal.metrics.receivedAmount).toBeUndefined();
});

test('owner shares report formulas without financial data; administrator has actual counts and all open work', async () => {
  const org = id(),
    other = id(),
    user = id(),
    contract = id();
  await OrganizationModel.collection.insertMany([
    { _id: org, name: 'Mine' },
    { _id: other, name: 'Other' },
  ]);
  await ContractModel.collection.insertMany([
    { _id: contract, orgId: org, createdAt: inside },
    { orgId: other, createdAt: inside },
  ]);
  await ReviewModel.collection.insertMany([
    {
      orgId: org,
      contractId: contract,
      status: 'completed',
      startedAt: new Date(inside - 1000),
      finishedAt: inside,
      result: { overallRiskLevel: 'high' },
    },
    {
      orgId: org,
      contractId: contract,
      status: 'completed',
      startedAt: inside,
      finishedAt: new Date(inside.getTime() + 1000),
      result: { overallRiskLevel: 'low' },
    },
    { orgId: org, status: 'running', createdAt: new Date(start - 10000) },
    { orgId: other, contractId: id(), status: 'failed', finishedAt: inside },
  ]);
  await PaymentModel.collection.insertMany([
    { orderCode: 9100000000001, orgId: other, status: 'paid', amount: 99000, currency: 'VND', paidAt: inside },
    { orderCode: 9100000000002, orgId: other, status: 'pending', amount: 50000, currency: 'VND', createdAt: inside },
  ]);
  const owner = await getDashboardInsights(
    { sub: String(user), role: 'owner', orgId: String(org) },
    query,
    now,
  );
  expect(owner.metrics).toMatchObject({
    uploads: 1,
    completed: 2,
    highRisk: 0,
    running: 1,
    successRate: 100,
  });
  expect(owner.distribution.find((row) => row.key === 'low').value).toBe(1);
  expect(owner.metrics.receivedAmount).toBeUndefined();
  expect(owner.metrics.unfulfilled).toBeUndefined();
  const admin = await getDashboardInsights(
    { sub: String(user), role: 'administrator' },
    query,
    now,
  );
  expect(admin.metrics).toMatchObject({
    organizations: 2,
    uploads: 2,
    failed: 1,
    receivedAmount: 99000,
    running: 1,
    unfulfilled: 1,
  });
});

test('expert totals exceed queue page limits and completed attempts survive reopens without double-counting', async () => {
  const me = id(),
    other = id(),
    sessionA = id(),
    sessionB = id();
  await ExpertReviewModel.collection.insertMany([
    ...Array.from({ length: 125 }, () => ({
      _id: id(),
      reviewId: id(),
      status: 'requested',
      requestedAt: inside,
    })),
    { _id: id(), reviewId: id(), expertId: me, status: 'in_progress', assignedAt: inside },
    { _id: id(), reviewId: id(), expertId: other, status: 'in_progress', assignedAt: inside },
    {
      _id: sessionA,
      reviewId: id(),
      expertId: me,
      status: 'approved',
      attempt: 1,
      assignedAt: new Date(inside - 60000),
      completedAt: inside,
    },
    {
      _id: sessionB,
      reviewId: id(),
      expertId: other,
      status: 'in_progress',
      attempt: 2,
      assignedAt: inside,
    },
  ]);
  await ExpertWorkRecordModel.collection.insertMany([
    {
      expertReviewId: sessionA,
      expertId: me,
      attempt: 1,
      status: 'approved',
      assignedAt: new Date(inside - 60000),
      completedAt: inside,
    },
    {
      expertReviewId: sessionB,
      expertId: me,
      attempt: 1,
      status: 'returned',
      assignedAt: new Date(inside - 120000),
      completedAt: inside,
    },
    { expertReviewId: id(), expertId: other, attempt: 1, status: 'approved', completedAt: inside },
    { expertReviewId: id(), expertId: me, attempt: 1, status: 'approved', completedAt: now },
  ]);
  const result = await getDashboardInsights({ sub: String(me), role: 'expert' }, query, now);
  expect(result.metrics).toEqual({
    waiting: 125,
    inProgress: 1,
    approved: 1,
    returned: 1,
    averageDurationMs: 90000,
  });
  expect(result.trend.reduce((sum, row) => sum + row.approved + row.returned, 0)).toBe(2);
  expect(JSON.stringify(result)).not.toContain('expertReviewId');
  expect(result.metrics.receivedAmount).toBeUndefined();
});

test('manager reports stored legal status and sources whose latest update is in the period', async () => {
  await LegalSourceModel.collection.insertMany([
    { code: 'source_a', status: 'in_force', ingestion: { status: 'completed' }, updatedAt: start },
    { code: 'source_b', status: 'amended', ingestion: { status: 'failed' }, updatedAt: inside },
    {
      code: 'source_c',
      status: 'repealed',
      ingestion: { status: 'paused' },
      updatedAt: new Date(start - 1),
    },
  ]);
  const result = await getDashboardInsights({ sub: String(id()), role: 'manager' }, query, now);
  expect(result.metrics).toMatchObject({
    legalSources: 3,
    inForce: 1,
    updated: 2,
    ingestionFailed: 1,
    ingestionPending: 1,
  });
  expect(result.trend.reduce((sum, row) => sum + row.updated, 0)).toBe(2);
  expect(result.metrics.receivedAmount).toBeUndefined();
});

test('empty expert durations are unknown; invalid organization roles fail closed', async () => {
  const expert = await getDashboardInsights(
    { sub: String(id()), role: 'expert' },
    { period: 'year' },
    now,
  );
  expect(expert.metrics.averageDurationMs).toBeNull();
  expect(expert.trend).toHaveLength(11);
  await expect(
    getDashboardInsights({ sub: String(id()), role: 'staff' }, query, now),
  ).rejects.toThrow();
});

test('HTTP authentication and strict filters cannot widen scope or grant operational reports to other roles', async () => {
  const user = await UserModel.create({
    name: 'Manager',
    email: 'dashboard@example.com',
    passwordHash: 'unused',
    platformRole: 'manager',
    emailVerifiedAt: now,
  });
  const token = jwt.sign(
    { sub: String(user._id), role: 'manager', permissionsVersion: 0 },
    process.env.JWT_ACCESS_SECRET,
  );
  await request(app).get('/api/v1/dashboard/insights').expect(401);
  for (const suffix of [
    '?period=day',
    `?organizationId=${id()}`,
    '?role=administrator',
    '?period=year&anchor=2020-01-01',
  ]) {
    await request(app)
      .get('/api/v1/dashboard/insights' + suffix)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  }
  const response = await request(app)
    .get('/api/v1/dashboard/insights?period=month')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  expect(response.body.data.role).toBe('manager');
  expect(response.headers['cache-control']).toBe('private, no-store');
  await request(app).get('/api/v1/reports').set('Authorization', `Bearer ${token}`).expect(403);
  const org = id();
  user.platformRole = undefined;
  await user.save();
  await MembershipModel.create({ userId: user._id, orgId: org, role: 'staff' });
  const staffToken = jwt.sign(
    { sub: String(user._id), role: 'staff', orgId: String(org), permissionsVersion: 0 },
    process.env.JWT_ACCESS_SECRET,
  );
  const staff = await request(app)
    .get('/api/v1/dashboard/insights')
    .set('Authorization', `Bearer ${staffToken}`)
    .expect(200);
  expect(staff.body.data.scope.id).toBe(String(org));
  await request(app)
    .get('/api/v1/reports')
    .set('Authorization', `Bearer ${staffToken}`)
    .expect(403);
});
