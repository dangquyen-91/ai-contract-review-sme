process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'password-reset-test-access';
process.env.JWT_REFRESH_SECRET = 'password-reset-test-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.GEMINI_API_KEY = '';
jest.mock('../dist/services/email/email.service', () => ({
  ensureEmailConfigured: jest.fn(),
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createApp } = require('../dist/app');
const { logger } = require('../dist/config/logger');
logger.silent = true;
const { UserModel } = require('../dist/models/user.model');
const { PasswordResetModel } = require('../dist/models/passwordReset.model');
const { seedDefaultRoles, getRoleByCode } = require('../dist/services/identity/role.service');
const { tokensForUser } = require('../dist/services/identity/auth.service');
const { sendEmail } = require('../dist/services/email/email.service');
let repl,
  app,
  sequence = 0,
  ip = 0;
const oldPassword = 'OriginalPassword123!';
const newPassword = 'ReplacementPassword456!';
const code = () => sendEmail.mock.calls.at(-1)[0].text.match(/\b\d{6}\b/)[0];
const post = (path, body) =>
  request(app).post(`/api/v1/auth/${path}`).set('X-Forwarded-For', `198.51.100.${ip}`).send(body);
async function account(extra = {}) {
  const role = await getRoleByCode('user');
  return (
    await UserModel.create({
      name: 'Recovery user',
      email: `reset-${++sequence}@example.com`,
      passwordHash: await bcrypt.hash(oldPassword, 10),
      roleId: role._id,
      emailVerifiedAt: new Date(),
      ...extra,
    })
  ).populate('roleId');
}
async function start(user) {
  const response = await post('forgot-password', { email: user.email });
  expect(response.status).toBe(202);
  return { challengeId: response.body.data.challengeId, code: code(), response };
}
const reset = (flow, password = newPassword) =>
  post('reset-password', { challengeId: flow.challengeId, code: flow.code, password });
beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  await seedDefaultRoles();
  await Promise.all([UserModel.init(), PasswordResetModel.init()]);
  app = createApp();
  app.set('trust proxy', 1);
});
beforeEach(() => {
  ip++;
});
afterAll(async () => {
  await mongoose.disconnect();
  if (repl) await repl.stop();
});

test('reset hashes the password, consumes the OTP and revokes old access and refresh tokens', async () => {
  const user = await account();
  const old = tokensForUser(user, true);
  const legacy = jwt.sign({ sub: user.id, remember: true }, process.env.JWT_REFRESH_SECRET);
  const flow = await start(user);
  expect(flow.response.body.data.resendAfterSeconds).toBe(60);
  expect(flow.response.body.data).not.toHaveProperty('code');
  const stored = await PasswordResetModel.findOne({ email: user.email }).select(
    '+challengeHash +otpHash',
  );
  expect(stored.challengeHash).not.toBe(flow.challengeId);
  expect(stored.otpHash).not.toBe(flow.code);
  const result = await reset(flow);
  expect(result.status).toBe(200);
  expect(result.body.data).toEqual({ reset: true });
  const saved = await UserModel.findById(user.id).select('+passwordHash');
  expect(await bcrypt.compare(newPassword, saved.passwordHash)).toBe(true);
  expect(saved.orgId).toBeUndefined();
  expect(saved.authVersion).toBe(1);
  expect((await reset(flow)).status).toBe(400);
  const stale = await request(app)
    .post('/api/v1/auth/onboarding/complete')
    .set('Authorization', `Bearer ${old.accessToken}`)
    .send({});
  expect(stale.status).toBe(401);
  for (const refreshToken of [old.refreshToken, legacy])
    expect((await post('refresh', { refreshToken })).status).toBe(401);
  expect((await post('login', { email: user.email, password: oldPassword })).status).toBe(401);
  const login = await post('login', { email: user.email, password: newPassword });
  expect(login.status).toBe(200);
  expect(login.body.data.user.orgId).toBeNull();
  expect((await post('refresh', { refreshToken: login.body.data.refreshToken })).status).toBe(200);
});

test('unknown and inactive emails have the same public response and send no email', async () => {
  const known = await start(await account());
  const knownError = await reset({ ...known, code: known.code === '000000' ? '111111' : '000000' });
  const inactive = await account({ isActive: false });
  for (const email of [`unknown-${++sequence}@example.com`, inactive.email]) {
    const before = sendEmail.mock.calls.length;
    const result = await post('forgot-password', { email });
    expect(result.status).toBe(202);
    expect(Object.keys(result.body.data).sort()).toEqual(
      Object.keys(known.response.body.data).sort(),
    );
    expect(result.body.data.message).toBe(known.response.body.data.message);
    expect(sendEmail.mock.calls.length).toBe(before);
    const invalid = await reset({ challengeId: result.body.data.challengeId, code: '000000' });
    expect(invalid.status).toBe(knownError.status);
    expect(invalid.body.error.message).toBe(knownError.body.error.message);
  }
});

test('active unverified accounts receive recovery email and are verified only after a correct OTP', async () => {
  const user = await account({ emailVerifiedAt: null });
  const flow = await start(user);
  expect(sendEmail.mock.calls.at(-1)[0].to).toBe(user.email);
  expect((await UserModel.findById(user.id)).emailVerifiedAt).toBeNull();
  const wrong = { ...flow, code: flow.code === '000000' ? '111111' : '000000' };
  expect((await reset(wrong)).status).toBe(400);
  expect((await UserModel.findById(user.id)).emailVerifiedAt).toBeNull();
  expect((await reset(flow)).status).toBe(200);
  const saved = await UserModel.findById(user.id);
  expect(saved.emailVerifiedAt).toBeInstanceOf(Date);
  expect(saved.orgId).toBeUndefined();
  expect((await reset(flow)).status).toBe(400);
  const login = await post('login', { email: user.email, password: newPassword });
  expect(login.status).toBe(200);
  expect(login.body.data.accessToken).toEqual(expect.any(String));
});

test('Google-only accounts can establish a password by email without changing their Google link or organization', async () => {
  const user = await account({ googleSubject: 'password-setup-google', hasPassword: false });
  const flow = await start(user);
  expect((await reset(flow)).status).toBe(200);
  const saved = await UserModel.findById(user.id).select('+googleSubject');
  expect(saved.hasPassword).toBe(true);
  expect(saved.googleSubject).toBe('password-setup-google');
  expect(saved.orgId).toBeUndefined();
  const login = await post('login', { email: user.email, password: newPassword });
  expect(login.status).toBe(200);
});

test('five incorrect attempts block even the correct code, and expired codes fail', async () => {
  const flow = await start(await account());
  const wrong = { ...flow, code: flow.code === '000000' ? '111111' : '000000' };
  for (let n = 0; n < 5; n++) expect((await reset(wrong)).status).toBe(n === 4 ? 429 : 400);
  expect((await reset(flow)).status).toBe(429);
  const user = await account();
  const expired = await start(user);
  await PasswordResetModel.updateOne({ email: user.email }, { $set: { expiresAt: new Date(0) } });
  expect((await reset(expired)).status).toBe(400);
});

test('resending enforces cooldown, invalidates the previous challenge and enforces hourly limits', async () => {
  const user = await account();
  const first = await start(user);
  expect((await post('forgot-password', { email: user.email })).status).toBe(429);
  await PasswordResetModel.updateOne(
    { email: user.email },
    { $set: { lastSentAt: new Date(Date.now() - 61000) } },
  );
  const second = await start(user);
  expect(second.challengeId).not.toBe(first.challengeId);
  expect((await reset(first)).status).toBe(400);
  expect((await reset(second)).status).toBe(200);
  await PasswordResetModel.updateOne(
    { email: user.email },
    { $set: { lastSentAt: new Date(0), sentCount: 5 } },
  );
  expect((await post('forgot-password', { email: user.email })).status).toBe(429);
});

test('concurrent successful submissions consume the challenge only once', async () => {
  const user = await account();
  const flow = await start(user);
  const results = await Promise.all([reset(flow), reset(flow, 'OtherReplacement789!')]);
  expect(results.filter((result) => result.status === 200)).toHaveLength(1);
  expect(results.filter((result) => result.status === 400)).toHaveLength(1);
  expect((await UserModel.findById(user.id)).authVersion).toBe(1);
});

test('delivery failures cannot activate an OTP and disabled accounts cannot be recovered', async () => {
  const user = await account();
  sendEmail.mockRejectedValueOnce(new Error('SMTP unavailable'));
  const failed = await start(user);
  expect((await reset(failed)).status).toBe(400);
  const other = await account();
  const flow = await start(other);
  await UserModel.updateOne({ _id: other._id }, { $set: { isActive: false } });
  expect((await reset(flow)).status).toBe(400);
});

test('password rules apply before consuming an OTP, and legacy accounts without authVersion can reset', async () => {
  const user = await account();
  await UserModel.updateOne({ _id: user._id }, { $unset: { authVersion: 1 } });
  const flow = await start(user);
  for (const password of ['short', 'é'.repeat(37)])
    expect((await reset(flow, password)).status).toBe(400);
  expect((await PasswordResetModel.findOne({ email: user.email })).attempts).toBe(0);
  expect((await reset(flow)).status).toBe(200);
  expect((await UserModel.findById(user.id)).authVersion).toBe(1);
  expect((await post('forgot-password', { email: 'invalid-email' })).status).toBe(400);
});
