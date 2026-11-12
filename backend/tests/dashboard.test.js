process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'dashboard-test-access';
process.env.JWT_REFRESH_SECRET = 'dashboard-test-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.MONGOMS_DOWNLOAD_DIR = require('path').join(__dirname, '../node_modules/.cache/mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../dist/app');
const { UserModel } = require('../dist/models/user.model');
const { OrganizationModel } = require('../dist/models/organization.model');
const { ContractModel } = require('../dist/models/contract.model');
const { ContractVersionModel } = require('../dist/models/contractVersion.model');
const { seedDefaultRoles, getRoleByCode } = require('../dist/services/identity/role.service');
const { tokensForUser, refresh } = require('../dist/services/identity/auth.service');
const { logger } = require('../dist/config/logger');
logger.silent = true;
let mongo, app, serial = 0;
async function account(role, orgId) {
  return (await UserModel.create({ name: role, email: `dashboard-${++serial}@example.com`,
    roleId: (await getRoleByCode(role))._id, orgId, passwordHash: 'unused', isActive: true,
    emailVerifiedAt: new Date(),
  })).populate('roleId');
}
const bearer = user => `Bearer ${tokensForUser(user).accessToken}`;
async function contract(scopeId, user, status, risks = []) {
  const doc = await ContractModel.create({ orgId: scopeId, uploadedBy: user._id, title: `Contract ${++serial}`, status });
  for (let i = 0; i < risks.length; i++) {
    await ContractVersionModel.create({ contractId: doc._id, versionNumber: i + 1, createdBy: user._id,
      overallRiskLevel: risks[i], fileName: `version-${i + 1}.docx`,
    });
  }
  return doc;
}
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await seedDefaultRoles();
  app = createApp();
});
beforeEach(async () => {
  await Promise.all([UserModel.deleteMany({}), OrganizationModel.deleteMany({}), ContractModel.deleteMany({}), ContractVersionModel.deleteMany({})]);
});
afterAll(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); });

test('personal dashboard counts only its contracts, keeps membership empty and returns latest version risk', async () => {
  const user = await account('user');
  const other = await account('user');
  const saved = await contract(user._id, user, 'reviewed', ['high', 'low']);
  await contract(user._id, user, 'processing', ['high']);
  await contract(other._id, other, 'reviewed', ['high']);
  const res = await request(app).get('/api/v1/dashboard').set('Authorization', bearer(user));
  expect(res.status).toBe(200);
  expect(res.headers['cache-control']).toBe('private, no-store');
  expect(res.body.data).toMatchObject({ contractScopeId: user.id, organization: { id: '' },
    totalContracts: 2, stats: { processing: 1, reviewed: 1, highRisk: 1 }, user: { name: user.name, email: user.email } });
  expect(res.body.data.contracts.find(item => item._id === saved.id)).toMatchObject({ overallRiskLevel: 'low', fileName: 'version-2.docx' });
  expect(res.body.data.distribution).toBeUndefined();
  expect((await UserModel.findById(user._id)).orgId).toBeUndefined();
});

test('staff summary covers the whole organization beyond the ten recent documents and excludes other organizations', async () => {
  const org = await OrganizationModel.create({ name: 'Team' });
  const owner = await account('owner', org._id);
  const staff = await account('staff', org._id);
  const other = await account('user');
  for (let i = 0; i < 12; i++) await contract(org._id, owner, 'uploaded');
  await contract(org._id, staff, 'reviewed', ['low', 'high']);
  await contract(org._id, staff, 'archived', ['none']);
  await contract(other._id, other, 'reviewed', ['high']);
  const res = await request(app).get('/api/v1/dashboard').set('Authorization', bearer(staff));
  expect(res.status).toBe(200);
  expect(res.body.data.totalContracts).toBe(14);
  expect(res.body.data.contracts).toHaveLength(10);
  expect(res.body.data.organization).toMatchObject({ id: org.id, name: 'Team' });
  expect(res.body.data.distribution).toEqual({ statuses: { uploaded: 12, processing: 0, reviewed: 1, archived: 1 }, risks: { high: 1, medium: 0, low: 0, none: 1 } });
  const ownerRes = await request(app).get('/api/v1/dashboard').set('Authorization', bearer(owner));
  expect(ownerRes.body.data.totalContracts).toBe(14);
});

test('switching a member to personal workspace excludes organization contracts', async () => {
  const org = await OrganizationModel.create({ name: 'Team' });
  const staff = await account('staff', org._id);
  await contract(org._id, staff, 'reviewed', ['high']);
  await contract(staff._id, staff, 'uploaded', ['low']);
  const personal = await refresh(tokensForUser(staff).refreshToken, undefined, 'personal');
  const res = await request(app).get('/api/v1/dashboard').set('Authorization', `Bearer ${personal.accessToken}`);
  expect(res.status).toBe(200);
  expect(res.body.data).toMatchObject({ role: 'user', contractScopeId: staff.id, organization: { id: '' }, totalContracts: 1, stats: { highRisk: 0 } });
});

test('empty dashboard returns zero totals', async () => {
  const user = await account('user');
  const res = await request(app).get('/api/v1/dashboard').set('Authorization', bearer(user));
  expect(res.status).toBe(200);
  expect(res.body.data).toMatchObject({ contracts: [], totalContracts: 0, stats: { processing: 0, reviewed: 0, highRisk: 0 } });
});

test.each(['administrator', 'manager', 'expert'])('%s cannot use the personal/organization dashboard', async role => {
  const user = await account(role);
  expect((await request(app).get('/api/v1/dashboard').set('Authorization', bearer(user))).status).toBe(403);
});

test('dashboard requires authentication', async () => {
  expect((await request(app).get('/api/v1/dashboard')).status).toBe(401);
});

test('a legacy user orgId does not grant organization dashboard access', async () => {
  const org = await OrganizationModel.create({ name: 'Legacy organization' });
  const user = await account('user', org._id);
  expect((await request(app).get('/api/v1/dashboard').set('Authorization', bearer(user))).status).toBe(403);
});
