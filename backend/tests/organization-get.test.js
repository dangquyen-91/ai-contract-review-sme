// Unit test cases for ORG-02 getOrganization (UTCID01–UTCID09 in the test-case sheet).
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'organization-get-access';
process.env.JWT_REFRESH_SECRET = 'organization-get-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const request = require('supertest');
const { createApp } = require('../dist/app');
const { logger } = require('../dist/config/logger');
logger.silent = true;
const { UserModel } = require('../dist/models/user.model');
const { OrganizationModel } = require('../dist/models/organization.model');
const { MembershipModel } = require('../dist/models/membership.model');
const { seedDefaultRoles } = require('../dist/services/identity/role.service');
const { createAccount, sessionOf } = require('./helpers/accounts');

let repl, app, sequence = 0, company, otherCompany, owner, staff;
const account = (role = 'user', orgId) =>
  createAccount({ role, orgId, name: 'Org reader', email: `org-get-${++sequence}@example.com` });
const get = (id, token) => {
  const call = request(app).get(`/api/v1/organizations/${id}`);
  return token ? call.set('Authorization', `Bearer ${token}`) : call;
};
const errorOf = (response) => response.body.error.message;

beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  await seedDefaultRoles();
  await Promise.all([UserModel.init(), MembershipModel.init()]);
  app = createApp();
  company = await OrganizationModel.create({
    name: 'Công ty Minh Tâm',
    taxCode: '0312345678',
    industry: 'retail',
    address: '12 Hoàng Hoa Thám, Phường Ba Đình, Thành phố Hà Nội',
  });
  otherCompany = await OrganizationModel.create({ name: 'Công ty khác', taxCode: '0398765432' });
  owner = await account('owner', company._id);
  staff = await account('staff', company._id);
});
afterAll(async () => {
  await mongoose.disconnect();
  if (repl) await repl.stop();
});

test('UTCID01: the Owner reads the details of their organization', async () => {
  const response = await get(company.id, owner.testSession.accessToken);
  expect(response.status).toBe(200);
  expect(response.body.data).toMatchObject({
    id: company.id,
    name: 'Công ty Minh Tâm',
    taxCode: '0312345678',
    industry: 'retail',
    address: '12 Hoàng Hoa Thám, Phường Ba Đình, Thành phố Hà Nội',
  });
});

test('UTCID02: Staff of the same organization can read it', async () => {
  const response = await get(company.id, staff.testSession.accessToken);
  expect(response.status).toBe(200);
  expect(response.body.data.id).toBe(company.id);
});

test("UTCID03: another organization's ID is forbidden", async () => {
  const response = await get(otherCompany.id, owner.testSession.accessToken);
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Forbidden');
  expect(response.body.data).toBeUndefined();
});

test('UTCID04: a personal user without an organization is rejected', async () => {
  const personal = await account();
  const response = await get(company.id, personal.testSession.accessToken);
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Organization setup required');
});

test('UTCID05: a system account (Manager) is rejected', async () => {
  const manager = await account('manager');
  const response = await get(company.id, manager.testSession.accessToken);
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Organization setup required');
});

test('UTCID06: the Owner working in the personal workspace is rejected', async () => {
  const personalSession = await sessionOf(owner, true, 'personal');
  const response = await get(company.id, personalSession.accessToken);
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Organization setup required');
});

test('UTCID07: an invalid organization ID is rejected', async () => {
  const response = await get('abc', owner.testSession.accessToken);
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Invalid organization id');
});

test('UTCID08: a request without a token is rejected', async () => {
  const response = await get(company.id);
  expect(response.status).toBe(401);
  expect(errorOf(response)).toBe('Missing bearer token');
});

test('UTCID09: an organization record that no longer exists returns not found', async () => {
  const gone = await OrganizationModel.create({ name: 'Sắp xóa' });
  const member = await account('owner', gone._id);
  await OrganizationModel.deleteOne({ _id: gone._id });
  const response = await get(gone.id, member.testSession.accessToken);
  expect(response.status).toBe(404);
  expect(errorOf(response)).toBe('Organization not found');
});
