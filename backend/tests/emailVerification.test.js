process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'verification-test-access';
process.env.JWT_REFRESH_SECRET = 'verification-test-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.GEMINI_API_KEY = '';
process.env.MONGOMS_DOWNLOAD_DIR = require('path').join(
  __dirname,
  '../node_modules/.cache/mongodb-memory-server',
);
jest.mock('../dist/services/email/email.service', () => ({
  ensureEmailConfigured: jest.fn(),
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));
const mongoose = require('mongoose');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createHash } = require('crypto');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { createApp } = require('../dist/app');
const { logger } = require('../dist/config/logger');
logger.silent = true;
const { UserModel } = require('../dist/models/user.model');
const { EmailVerificationModel } = require('../dist/models/emailVerification.model');
const { OrganizationModel } = require('../dist/models/organization.model');
const { OrganizationInvitationModel } = require('../dist/models/organizationInvitation.model');
const { seedDefaultRoles, getRoleByCode } = require('../dist/services/identity/role.service');
const { startEmailVerification } = require('../dist/services/identity/emailVerification.service');
const { sendEmail } = require('../dist/services/email/email.service');
const { tokensForUser } = require('../dist/services/identity/auth.service');
const { seedPlans } = require('../dist/services/billing/subscription.service');
const { initializeSubscriptionModels } = require('../dist/models/subscription.model');
let replica,
  app,
  serial = 0;
const password = 'VerificationTest123!';
const lastCode = () => sendEmail.mock.calls.at(-1)[0].text.match(/\b\d{6}\b/)[0];
async function register(extra = {}) {
  const email = `verification-${++serial}@example.com`;
  const response = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Test Account', email, password, ...extra });
  expect(response.status).toBe(202);
  return { response, challenge: response.body.data, code: lastCode(), email: extra.email ?? email };
}
const verify = (challenge, code, invitationToken) =>
  request(app)
    .post('/api/v1/auth/verify-email')
    .send({ challengeId: challenge.challengeId, code, invitationToken });
const resend = (challenge) =>
  request(app)
    .post('/api/v1/auth/resend-verification')
    .send({ challengeId: challenge.challengeId });
const allowResend = (email) =>
  EmailVerificationModel.updateOne(
    { email },
    { $set: { lastSentAt: new Date(Date.now() - 61_000) } },
  );

beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replica.getUri());
  await seedDefaultRoles();
  await EmailVerificationModel.init();
  await UserModel.init();
  await OrganizationInvitationModel.init();
  await initializeSubscriptionModels();
  await seedPlans();
  app = createApp();
});
afterAll(async () => {
  await mongoose.disconnect();
  if (replica) await replica.stop();
});

test('registration creates no user/session before OTP and verified users log in without further email', async () => {
  const flow = await register();
  expect(flow.response.body.data.accessToken).toBeUndefined();
  expect(flow.response.body.data.user).toBeUndefined();
  expect(await UserModel.exists({ email: flow.email })).toBeNull();
  const stored = await EmailVerificationModel.findOne({ email: flow.email }).select(
    '+otpHash +challengeHash +passwordHash',
  );
  expect(stored.otpHash).not.toBe(flow.code);
  expect(stored.challengeHash).not.toBe(flow.challenge.challengeId);
  expect(await bcrypt.compare(password, stored.passwordHash)).toBe(true);
  const response = await verify(flow.challenge, flow.code);
  expect(response.status).toBe(200);
  expect(response.body.data.user).toMatchObject({
    email: flow.email,
    emailVerified: true,
    orgId: null,
  });
  const count = sendEmail.mock.calls.length;
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: flow.email, password, remember: true });
  expect(login.status).toBe(200);
  expect(sendEmail.mock.calls).toHaveLength(count);
  expect(jwt.verify(login.body.data.refreshToken, process.env.JWT_REFRESH_SECRET).remember).toBe(
    true,
  );
  expect((await verify(flow.challenge, flow.code)).status).toBe(400);
  expect(
    (
      await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Duplicate', email: flow.email, password })
    ).status,
  ).toBe(409);
});

test('wrong codes are counted persistently and the fifth failure blocks even the correct code', async () => {
  const flow = await register();
  const wrong = flow.code === '000000' ? '111111' : '000000';
  const results = await Promise.all(Array.from({ length: 5 }, () => verify(flow.challenge, wrong)));
  expect(results.filter((result) => result.status === 400)).toHaveLength(4);
  expect(results.filter((result) => result.status === 429)).toHaveLength(1);
  expect((await verify(flow.challenge, flow.code)).status).toBe(429);
  expect((await EmailVerificationModel.findOne({ email: flow.email })).attempts).toBe(5);
  expect(await UserModel.exists({ email: flow.email })).toBeNull();
});

test('expired codes fail; resend enforces cooldown, invalidates old code and has hourly limit', async () => {
  const flow = await register();
  expect((await resend(flow.challenge)).status).toBe(429);
  await EmailVerificationModel.updateOne(
    { email: flow.email },
    { $set: { expiresAt: new Date(0) } },
  );
  expect((await verify(flow.challenge, flow.code)).status).toBe(400);
  await allowResend(flow.email);
  const next = await resend(flow.challenge);
  expect(next.status).toBe(202);
  const newCode = lastCode();
  // In the rare case random generation repeats the digits, use a definitely wrong code.
  expect(
    (
      await verify(
        next.body.data,
        flow.code === newCode ? (newCode === '000000' ? '111111' : '000000') : flow.code,
      )
    ).status,
  ).toBe(400);
  await allowResend(flow.email);
  await EmailVerificationModel.updateOne({ email: flow.email }, { $set: { sentCount: 5 } });
  expect((await resend(next.body.data)).status).toBe(429);
  expect((await verify(next.body.data, newCode)).status).toBe(200);
});

test('old accounts require correct password plus email OTP; existing refresh/access cannot bypass verification', async () => {
  const role = await getRoleByCode('user');
  const email = `legacy-${++serial}@example.com`;
  const user = await (
    await UserModel.create({
      name: 'Legacy',
      email,
      passwordHash: await bcrypt.hash(password, 4),
      roleId: role._id,
    })
  ).populate('roleId');
  const old = tokensForUser(user);
  expect(
    (await request(app).get('/api/v1/contracts').set('Authorization', `Bearer ${old.accessToken}`))
      .status,
  ).toBe(403);
  expect(
    (await request(app).post('/api/v1/auth/refresh').send({ refreshToken: old.refreshToken }))
      .status,
  ).toBe(401);
  const count = sendEmail.mock.calls.length;
  expect(
    (await request(app).post('/api/v1/auth/login').send({ email, password: 'incorrect' })).status,
  ).toBe(401);
  expect(sendEmail.mock.calls).toHaveLength(count);
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password, remember: true });
  expect(login.status).toBe(202);
  const result = await verify(login.body.data, lastCode());
  expect(result.status).toBe(200);
  expect(result.body.data.user.id).toBe(user.id);
  expect(result.body.data.remember).toBe(true);
  expect(jwt.verify(result.body.data.refreshToken, process.env.JWT_REFRESH_SECRET).remember).toBe(
    true,
  );
});

test('concurrent correct submissions consume OTP once and create only one account', async () => {
  const flow = await register();
  const results = await Promise.all([
    verify(flow.challenge, flow.code),
    verify(flow.challenge, flow.code),
  ]);
  expect(results.map((result) => result.status).sort()).toEqual([200, 400]);
  expect(await UserModel.countDocuments({ email: flow.email })).toBe(1);
});

test('email failure grants no access and resending can recover without starting over', async () => {
  const flow = await register();
  await allowResend(flow.email);
  sendEmail.mockRejectedValueOnce(
    new (require('../dist/errors/AppError').AppError)(
      'Could not send email. Please try again.',
      502,
    ),
  );
  expect((await resend(flow.challenge)).status).toBe(502);
  expect((await verify(flow.challenge, flow.code)).status).toBe(400);
  expect(await UserModel.exists({ email: flow.email })).toBeNull();
  await allowResend(flow.email);
  const retry = await resend(flow.challenge);
  expect(retry.status).toBe(202);
  expect((await verify(retry.body.data, lastCode())).status).toBe(200);
});

test('invitation context is required through verification and acceptance creates no personal org', async () => {
  const org = await OrganizationModel.create({ name: 'OTP invited team' });
  const token = 'b'.repeat(64);
  const email = `invited-${++serial}@example.com`;
  const invitation = await OrganizationInvitationModel.create({
    orgId: org._id,
    invitedBy: new mongoose.Types.ObjectId(),
    email,
    role: 'staff',
    tokenHash: createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + 3600_000),
  });
  const flow = await register({ email, invitationToken: token });
  expect((await verify(flow.challenge, flow.code)).status).toBe(400);
  const verified = await verify(flow.challenge, flow.code, token);
  expect(verified.status).toBe(200);
  expect(verified.body.data.user.orgId).toBeNull();
  const accepted = await request(app)
    .post('/api/v1/invitations/accept')
    .set('Authorization', `Bearer ${verified.body.data.accessToken}`)
    .send({ token });
  expect(accepted.status).toBe(200);
  expect(accepted.body.data.user).toMatchObject({ orgId: org.id, role: 'staff' });
  expect((await OrganizationInvitationModel.findById(invitation.id)).status).toBe('accepted');
});

test('revoked invitation cannot be used to finish registration', async () => {
  const org = await OrganizationModel.create({ name: 'Revoked team' });
  const token = 'c'.repeat(64);
  const email = `revoked-${++serial}@example.com`;
  const invitation = await OrganizationInvitationModel.create({
    orgId: org._id,
    invitedBy: new mongoose.Types.ObjectId(),
    email,
    role: 'staff',
    tokenHash: createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + 3600_000),
  });
  const flow = await register({ email, invitationToken: token });
  await OrganizationInvitationModel.updateOne(
    { _id: invitation._id },
    { $set: { status: 'revoked' } },
  );
  expect((await verify(flow.challenge, flow.code, token)).status).toBe(400);
  expect(await UserModel.exists({ email })).toBeNull();
});

test('concurrent code requests for one address send only once', async () => {
  const email = `concurrent-${++serial}@example.com`;
  const input = { email, name: 'Concurrent', passwordHash: await bcrypt.hash(password, 4) };
  const count = sendEmail.mock.calls.length;
  const results = await Promise.allSettled([
    startEmailVerification(input),
    startEmailVerification(input),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(sendEmail.mock.calls).toHaveLength(count + 1);
});
