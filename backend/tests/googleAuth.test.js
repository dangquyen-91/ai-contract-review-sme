process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'google-test-access';
process.env.JWT_REFRESH_SECRET = 'google-test-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';
process.env.GEMINI_API_KEY = '';
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn(() => ({ verifyIdToken: jest.fn() })),
}));
const { OAuth2Client } = require('google-auth-library');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { createHash } = require('crypto');
const { createApp } = require('../dist/app');
const { UserModel } = require('../dist/models/user.model');
const { OrganizationModel } = require('../dist/models/organization.model');
const { OrganizationInvitationModel } = require('../dist/models/organizationInvitation.model');
const { seedDefaultRoles, getRoleByCode } = require('../dist/services/identity/role.service');
const { logger } = require('../dist/config/logger');
logger.silent = true;
let replica,
  app,
  verifyToken,
  serial = 0;
const nonce = 'a'.repeat(64);
const signIn = (extra = {}) =>
  request(app)
    .post('/api/v1/auth/google')
    .send({ credential: 'signed-token', nonce, ...extra });
function identity(extra = {}) {
  const number = ++serial;
  const payload = {
    sub: `google-${number}`,
    email: `google-${number}@gmail.com`,
    name: 'Google User',
    email_verified: true,
    nonce,
    ...extra,
  };
  verifyToken.mockResolvedValue({ getPayload: () => payload });
  return payload;
}
beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replica.getUri());
  await seedDefaultRoles();
  await UserModel.init();
  await OrganizationInvitationModel.init();
  app = createApp();
  verifyToken = OAuth2Client.mock.results[0].value.verifyIdToken;
});
afterAll(async () => {
  await mongoose.disconnect();
  if (replica) await replica.stop();
});

test('new and returning Google users share one account with verified email and no organization', async () => {
  const payload = identity();
  const response = await signIn({ remember: true });
  expect(response.status).toBe(200);
  expect(response.body.data.user).toMatchObject({
    email: payload.email,
    emailVerified: true,
    role: 'user',
    orgId: null,
    hasCompletedOnboarding: false,
  });
  expect(response.body.data.accessToken).toBeTruthy();
  expect(verifyToken).toHaveBeenCalledWith({
    idToken: 'signed-token',
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const again = await signIn();
  expect(again.body.data.user.id).toBe(response.body.data.user.id);
  expect(await UserModel.countDocuments({ email: payload.email })).toBe(1);
  expect(response.body.data.user.googleSubject).toBeUndefined();
  expect(response.body.data.user.passwordHash).toBeUndefined();
});

test('invalid signature/issuer/audience/expiry from verifier, nonce and unverified email are rejected', async () => {
  verifyToken.mockRejectedValueOnce(new Error('Invalid signature'));
  expect((await signIn()).status).toBe(401);
  identity({ nonce: 'wrong' });
  expect((await signIn()).status).toBe(401);
  identity({ email_verified: false });
  expect((await signIn()).status).toBe(401);
  identity({ email: 'external@example.com' });
  expect((await signIn()).status).toBe(403);
  const workspace = identity({ email: 'employee@company.example', hd: 'company.example' });
  expect((await signIn()).body.data.user.email).toBe(workspace.email);
});

test('verified existing account links without duplicating account or altering owner rights', async () => {
  const payload = identity();
  const role = await getRoleByCode('owner');
  const orgId = new mongoose.Types.ObjectId();
  const user = await UserModel.create({
    email: payload.email,
    name: 'Existing Owner',
    roleId: role._id,
    orgId,
    emailVerifiedAt: new Date(),
    passwordHash: 'original-hash',
  });
  const response = await signIn();
  expect(response.status).toBe(200);
  expect(response.body.data.user).toMatchObject({
    id: user.id,
    role: 'owner',
    orgId: String(orgId),
  });
  const saved = await UserModel.findById(user.id).select('+passwordHash +googleSubject');
  expect(saved.passwordHash).toBe('original-hash');
  expect(saved.googleSubject).toBe(payload.sub);
});

test('disabled and unverified existing accounts cannot be taken over through Google', async () => {
  const role = await getRoleByCode('user');
  const payload = identity();
  const user = await UserModel.create({
    email: payload.email,
    name: 'Existing',
    roleId: role._id,
    passwordHash: 'existing-hash',
  });
  expect((await signIn()).status).toBe(409);
  await UserModel.updateOne(
    { _id: user._id },
    { $set: { emailVerifiedAt: new Date(), isActive: false } },
  );
  expect((await signIn()).status).toBe(401);
});

test('Google subject is stable and cannot silently move to another email or another subject', async () => {
  const payload = identity();
  expect((await signIn()).status).toBe(200);
  identity({ sub: payload.sub, email: 'changed@gmail.com' });
  expect((await signIn()).status).toBe(409);
  identity({ email: payload.email });
  expect((await signIn()).status).toBe(409);
});

test('invitation email must match and login does not accept or create a workspace', async () => {
  const payload = identity();
  const token = 'b'.repeat(64);
  const organization = await OrganizationModel.create({ name: 'Inviting company' });
  await OrganizationInvitationModel.create({
    orgId: organization._id,
    email: payload.email,
    role: 'staff',
    tokenHash: createHash('sha256').update(token).digest('hex'),
    invitedBy: new mongoose.Types.ObjectId(),
    expiresAt: new Date(Date.now() + 600000),
  });
  const wrong = identity();
  expect((await signIn({ invitationToken: token })).status).toBe(403);
  expect(await UserModel.exists({ email: wrong.email })).toBeNull();
  identity(payload);
  const acceptedLogin = await signIn({ invitationToken: token });
  expect(acceptedLogin.status).toBe(200);
  expect(acceptedLogin.body.data.user.orgId).toBeNull();
  expect((await OrganizationInvitationModel.findOne({ email: payload.email })).status).toBe(
    'pending',
  );
});
