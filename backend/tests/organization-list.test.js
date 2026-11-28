// Unit test cases for ORG-05 listOrganizations (UTCID01–UTCID15 in the test-case sheet).
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'organization-list-access';
process.env.JWT_REFRESH_SECRET = 'organization-list-refresh';
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
const { createAccount } = require('./helpers/accounts');

let repl, app, manager, owner, administrator;
// Oldest to newest; the list must come back in the opposite order.
const companies = [
  { name: 'Công ty Minh Tâm', taxCode: '0312345678', industry: 'retail', createdAt: new Date('2026-01-01') },
  { name: 'Công ty An Phát', taxCode: '0398765432', industry: 'technology', createdAt: new Date('2026-02-01') },
  { name: 'Xưởng gỗ Hòa Bình', taxCode: '0101234567', industry: 'retail', createdAt: new Date('2026-03-01') },
];
const list = (query, user) => {
  const call = request(app).get('/api/v1/organizations').query(query);
  return user ? call.set('Authorization', `Bearer ${user.testSession.accessToken}`) : call;
};
const names = (response) => response.body.data.map((item) => item.name);
const errorOf = (response) => response.body.error.message;

beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  await seedDefaultRoles();
  await Promise.all([UserModel.init(), MembershipModel.init()]);
  const [first] = await OrganizationModel.insertMany(companies);
  manager = await createAccount({ role: 'manager', name: 'Manager', email: 'org-list-manager@example.com' });
  administrator = await createAccount({ role: 'administrator', name: 'Admin', email: 'org-list-admin@example.com' });
  owner = await createAccount({ role: 'owner', orgId: first._id, name: 'Owner', email: 'org-list-owner@example.com' });
  app = createApp();
});
afterAll(async () => {
  await mongoose.disconnect();
  if (repl) await repl.stop();
});

test('UTCID01: the Manager lists every organization, newest first, with default paging', async () => {
  const response = await list({}, manager);
  expect(response.status).toBe(200);
  expect(names(response)).toEqual(['Xưởng gỗ Hòa Bình', 'Công ty An Phát', 'Công ty Minh Tâm']);
  expect(response.body.meta).toMatchObject({ page: 1, limit: 20, total: 3 });
});

test('UTCID02: the second page holds the remaining organization', async () => {
  const response = await list({ page: 2, limit: 2 }, manager);
  expect(response.status).toBe(200);
  expect(names(response)).toEqual(['Công ty Minh Tâm']);
  expect(response.body.meta).toMatchObject({ page: 2, limit: 2, total: 3 });
});

test('UTCID03: search by name trims and ignores letter case', async () => {
  const response = await list({ search: '  CÔNG TY minh  ' }, manager);
  expect(response.status).toBe(200);
  expect(names(response)).toEqual(['Công ty Minh Tâm']);
  expect(response.body.meta.total).toBe(1);
});

test('UTCID04: search by part of the tax code', async () => {
  const response = await list({ search: '98765' }, manager);
  expect(response.status).toBe(200);
  expect(names(response)).toEqual(['Công ty An Phát']);
});

test('UTCID05: filter by industry', async () => {
  const response = await list({ industry: 'retail' }, manager);
  expect(response.status).toBe(200);
  expect(names(response)).toEqual(['Xưởng gỗ Hòa Bình', 'Công ty Minh Tâm']);
  expect(response.body.meta.total).toBe(2);
});

test('UTCID06: search and industry must both match', async () => {
  const response = await list({ search: 'An Phát', industry: 'retail' }, manager);
  expect(response.status).toBe(200);
  expect(response.body.data).toEqual([]);
  expect(response.body.meta.total).toBe(0);
});

test('UTCID07: special characters in the search are matched literally', async () => {
  const response = await list({ search: '.*' }, manager);
  expect(response.status).toBe(200);
  expect(response.body.data).toEqual([]);
});

test('UTCID08: limit 1 is accepted', async () => {
  const response = await list({ limit: 1 }, manager);
  expect(response.status).toBe(200);
  expect(names(response)).toEqual(['Xưởng gỗ Hòa Bình']);
  expect(response.body.meta.total).toBe(3);
});

test('UTCID09: limit 100 is accepted', async () => {
  const response = await list({ limit: 100 }, manager);
  expect(response.status).toBe(200);
  expect(response.body.data).toHaveLength(3);
  expect(response.body.meta.limit).toBe(100);
});

test('UTCID10: a page after the last one is empty but keeps the total', async () => {
  const response = await list({ page: 2 }, manager);
  expect(response.status).toBe(200);
  expect(response.body.data).toEqual([]);
  expect(response.body.meta.total).toBe(3);
});

test('UTCID11: limit 101 is rejected', async () => {
  const response = await list({ limit: 101 }, manager);
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Number must be less than or equal to 100');
});

test('UTCID12: page 0 is rejected', async () => {
  const response = await list({ page: 0 }, manager);
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Number must be greater than or equal to 1');
});

test('UTCID13: an Owner cannot list all organizations', async () => {
  const response = await list({}, owner);
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Requires role: manager');
  expect(response.body.data).toBeUndefined();
});

test('UTCID14: an Administrator cannot list all organizations', async () => {
  const response = await list({}, administrator);
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Requires role: manager');
});

test('UTCID15: a request without a token is rejected', async () => {
  const response = await list({});
  expect(response.status).toBe(401);
  expect(errorOf(response)).toBe('Missing bearer token');
});
