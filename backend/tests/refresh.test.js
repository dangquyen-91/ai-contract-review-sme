// Unit test cases for AUTH-06 refresh (UTCID01–UTCID09 in the test-case sheet).
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'refresh-test-access';
process.env.JWT_REFRESH_SECRET = 'refresh-test-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../dist/app');
const { logger } = require('../dist/config/logger');
logger.silent = true;
const { UserModel } = require('../dist/models/user.model');
const { seedDefaultRoles } = require('../dist/services/identity/role.service');
const { createAccount } = require('./helpers/accounts');

let repl, app, sequence = 0, ip = 0;
const refresh = (refreshToken) =>
  request(app)
    .post('/api/v1/auth/refresh')
    .set('X-Forwarded-For', `198.51.100.${++ip}`)
    .send({ refreshToken });
const account = (extra = {}) =>
  createAccount({ name: 'Refresh user', email: `refresh-${++sequence}@example.com`, ...extra });
const expectRejected = (response, message) => {
  expect(response.status).toBe(401);
  expect(response.body.error.message).toBe(message);
};

beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  await seedDefaultRoles();
  await UserModel.init();
  app = createApp();
  app.set('trust proxy', 1);
});
afterAll(async () => {
  await mongoose.disconnect();
  if (repl) await repl.stop();
});

test('UTCID01: a valid refresh token returns new access and refresh tokens', async () => {
  const user = await account();
  const response = await refresh(user.testSession.refreshToken);
  expect(response.status).toBe(200);
  expect(response.body.data.accessToken).toEqual(expect.any(String));
  expect(response.body.data.refreshToken).toEqual(expect.any(String));
  expect(response.body.data.user.email).toBe(user.email);
});

test('UTCID02: a malformed token is rejected', async () => {
  expectRejected(await refresh('not-a-jwt'), 'Invalid or expired refresh token');
});

test('UTCID03: an expired token is rejected', async () => {
  const user = await account();
  const expired = jwt.sign({ sub: user.id, authVersion: 0 }, process.env.JWT_REFRESH_SECRET, { expiresIn: -10 });
  expectRejected(await refresh(expired), 'Invalid or expired refresh token');
});

test('UTCID04: a token signed with another secret is rejected', async () => {
  const user = await account();
  const forged = jwt.sign({ sub: user.id, authVersion: 0 }, 'attacker-secret');
  expectRejected(await refresh(forged), 'Invalid or expired refresh token');
});

test('UTCID05: a token of a deleted account is rejected', async () => {
  const user = await account();
  await UserModel.deleteOne({ _id: user._id });
  expectRejected(await refresh(user.testSession.refreshToken), 'Invalid refresh token');
});

test('UTCID06: a token of a disabled account is rejected', async () => {
  const user = await account();
  await UserModel.updateOne({ _id: user._id }, { $set: { isActive: false } });
  expectRejected(await refresh(user.testSession.refreshToken), 'Invalid refresh token');
});

test('UTCID07: a token issued before a password change is rejected', async () => {
  const user = await account();
  await UserModel.updateOne({ _id: user._id }, { $inc: { authVersion: 1 } });
  expectRejected(await refresh(user.testSession.refreshToken), 'Invalid refresh token');
});

test('UTCID08: an account whose email is not verified must sign in again', async () => {
  const user = await account();
  await UserModel.updateOne({ _id: user._id }, { $unset: { emailVerifiedAt: 1 } });
  expectRejected(await refresh(user.testSession.refreshToken), 'Verify your email by signing in again');
});

test('UTCID09: an empty refresh token fails validation', async () => {
  const response = await refresh('');
  expect(response.status).toBe(400);
});
