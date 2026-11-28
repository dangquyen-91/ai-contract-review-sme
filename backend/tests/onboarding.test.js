// Unit test cases for ONB-01 completeOnboarding (UTCID01–UTCID06 in the test-case sheet).
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'onboarding-test-access';
process.env.JWT_REFRESH_SECRET = 'onboarding-test-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const request = require('supertest');
const { createApp } = require('../dist/app');
const { logger } = require('../dist/config/logger');
logger.silent = true;
const { UserModel } = require('../dist/models/user.model');
const { OrganizationModel } = require('../dist/models/organization.model');
const { seedDefaultRoles } = require('../dist/services/identity/role.service');
const { createAccount } = require('./helpers/accounts');

let repl, app, sequence = 0;
const account = (extra = {}) =>
  createAccount({ name: 'Onboarding user', email: `onboarding-${++sequence}@example.com`, ...extra });
const complete = (token) => {
  const call = request(app).post('/api/v1/auth/onboarding/complete');
  return (token ? call.set('Authorization', `Bearer ${token}`) : call).send({});
};

beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  await seedDefaultRoles();
  await UserModel.init();
  app = createApp();
});
afterAll(async () => {
  await mongoose.disconnect();
  if (repl) await repl.stop();
});

test('UTCID01: a personal user completes onboarding without getting an organization', async () => {
  const user = await account({ hasCompletedOnboarding: false });
  const organizations = await OrganizationModel.countDocuments();
  const response = await complete(user.testSession.accessToken);
  expect(response.status).toBe(200);
  expect(response.body.data.user).toMatchObject({
    id: user.id,
    role: 'user',
    orgId: null,
    workspace: 'personal',
    hasCompletedOnboarding: true,
  });
  expect((await UserModel.findById(user.id)).hasCompletedOnboarding).toBe(true);
  expect(await OrganizationModel.countDocuments()).toBe(organizations);
});

test('UTCID02: an organization member keeps the organization and role', async () => {
  const org = await OrganizationModel.create({ name: 'Onboarding company' });
  const staff = await account({ role: 'staff', orgId: org._id, hasCompletedOnboarding: false });
  const response = await complete(staff.testSession.accessToken);
  expect(response.status).toBe(200);
  expect(response.body.data.user).toMatchObject({
    role: 'staff',
    orgId: org.id,
    workspace: 'organization',
    hasCompletedOnboarding: true,
  });
});

test('UTCID03: completing onboarding again is harmless', async () => {
  const user = await account({ hasCompletedOnboarding: true });
  const response = await complete(user.testSession.accessToken);
  expect(response.status).toBe(200);
  expect(response.body.data.user.hasCompletedOnboarding).toBe(true);
});

test('UTCID04: a request without a token is rejected', async () => {
  const response = await complete();
  expect(response.status).toBe(401);
  expect(response.body.error.message).toBe('Missing bearer token');
});

test('UTCID05: a disabled account cannot complete onboarding', async () => {
  const user = await account({ hasCompletedOnboarding: false });
  await UserModel.updateOne({ _id: user._id }, { $set: { isActive: false } });
  const response = await complete(user.testSession.accessToken);
  expect(response.status).toBe(401);
  expect(response.body.error.message).toBe('User is inactive or no longer exists');
  expect((await UserModel.findById(user.id)).hasCompletedOnboarding).toBe(false);
});

test('UTCID06: a token issued before a password change is rejected', async () => {
  const user = await account({ hasCompletedOnboarding: false });
  await UserModel.updateOne({ _id: user._id }, { $inc: { authVersion: 1, permissionsVersion: 1 } });
  const response = await complete(user.testSession.accessToken);
  expect(response.status).toBe(401);
  expect(response.body.error.message).toBe('Account permissions changed. Refresh your access token.');
});
