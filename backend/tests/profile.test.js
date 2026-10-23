process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'profile-access';
process.env.JWT_REFRESH_SECRET = 'profile-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.GEMINI_API_KEY = '';
jest.mock('../dist/config/cloudinary', () => ({
  isCloudinaryConfigured: true,
  cloudinary: {
    uploader: {
      upload_stream: jest.fn((options, callback) => ({
        end: () =>
          callback(null, {
            secure_url: `https://res.cloudinary.com/test/image/upload/${options.public_id}.webp`,
            public_id: `lawscan/avatars/${options.public_id}`,
          }),
      })),
      destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
    },
  },
}));
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { createApp } = require('../dist/app');
const { UserModel } = require('../dist/models/user.model');
const { OrganizationModel } = require('../dist/models/organization.model');
const { seedDefaultRoles, getRoleByCode } = require('../dist/services/identity/role.service');
const { tokensForUser } = require('../dist/services/identity/auth.service');
const { cloudinary } = require('../dist/config/cloudinary');
const { logger } = require('../dist/config/logger');
logger.silent = true;
let repl,
  app,
  serial = 0;
const currentPassword = 'CurrentPassword123!';
const newPassword = 'ReplacementPassword456!';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhWQAAAAASUVORK5CYII=',
  'base64',
);
async function user(extra = {}, role = 'user') {
  const roleDoc = await getRoleByCode(role);
  return (
    await UserModel.create({
      name: 'Profile user',
      email: `profile-${++serial}@example.com`,
      passwordHash: await bcrypt.hash(currentPassword, 10),
      roleId: roleDoc._id,
      emailVerifiedAt: new Date(),
      ...extra,
    })
  ).populate('roleId');
}
const auth = (account) => `Bearer ${tokensForUser(account).accessToken}`;
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

test('profile is private and works without an organization, exposing no credential or storage secrets', async () => {
  expect((await request(app).get('/api/v1/profile')).status).toBe(401);
  const first = await user();
  const second = await user();
  const response = await request(app)
    .get(`/api/v1/profile?userId=${second.id}`)
    .set('Authorization', auth(first));
  expect(response.status).toBe(200);
  expect(response.body.data.user).toMatchObject({
    id: first.id,
    email: first.email,
    hasPassword: true,
    orgId: null,
    phone: '',
  });
  expect(response.body.data.organization).toBeNull();
  for (const field of ['passwordHash', 'googleSubject', 'avatarPublicId', 'authVersion'])
    expect(response.body.data.user).not.toHaveProperty(field);
});

test('self updates name and phone, cannot change email, role, organization or another account', async () => {
  const first = await user();
  const other = await user();
  const response = await request(app)
    .patch('/api/v1/profile')
    .set('Authorization', auth(first))
    .send({ name: '  New name  ', phone: '+84 901234567' });
  expect(response.status).toBe(200);
  expect(response.body.data.user).toMatchObject({
    name: 'New name',
    phone: '+84 901234567',
    orgId: null,
  });
  expect((await UserModel.findById(other.id)).name).toBe(other.name);
  for (const extra of [
    { email: 'other@example.com' },
    { roleId: other.roleId._id },
    { orgId: new mongoose.Types.ObjectId() },
    { isActive: false },
  ]) {
    const blocked = await request(app)
      .patch('/api/v1/profile')
      .set('Authorization', auth(first))
      .send({ name: 'Hacked', phone: '', ...extra });
    expect(blocked.status).toBe(400);
  }
  expect((await UserModel.findById(first.id)).email).toBe(first.email);
  expect(
    (
      await request(app)
        .patch('/api/v1/profile')
        .set('Authorization', auth(first))
        .send({ name: ' ', phone: '' })
    ).status,
  ).toBe(400);
  expect(
    (
      await request(app)
        .patch('/api/v1/profile')
        .set('Authorization', auth(first))
        .send({ name: 'Valid name', phone: '0-------' })
    ).status,
  ).toBe(400);
});

test('organization members see their organization and role in their own profile', async () => {
  const org = await OrganizationModel.create({ name: 'Profile company' });
  const member = await user({ orgId: org._id }, 'staff');
  const response = await request(app).get('/api/v1/profile').set('Authorization', auth(member));
  expect(response.body.data.organization).toMatchObject({ id: org.id, name: org.name });
  expect(response.body.data.user.role).toBe('staff');
});

test('avatar upload, replacement and deletion update only this account and clean up replaced files', async () => {
  const account = await user();
  const bearer = auth(account);
  const upload = () =>
    request(app)
      .post('/api/v1/profile/avatar')
      .set('Authorization', bearer)
      .attach('avatar', png, { filename: 'avatar.png', contentType: 'image/png' });
  const first = await upload();
  expect(first.status).toBe(200);
  expect(first.body.data.user.avatarUrl).toMatch(/^https:\/\/res.cloudinary.com\//);
  const old = await UserModel.findById(account.id).select('+avatarPublicId');
  expect(first.body.data.user).not.toHaveProperty('avatarPublicId');
  const second = await upload();
  expect(second.status).toBe(200);
  expect(second.body.data.user.avatarUrl).not.toBe(first.body.data.user.avatarUrl);
  expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(old.avatarPublicId, expect.any(Object));
  const removed = await request(app).delete('/api/v1/profile/avatar').set('Authorization', bearer);
  expect(removed.status).toBe(200);
  expect(removed.body.data.user.avatarUrl).toBeNull();
  expect((await UserModel.findById(account.id)).orgId).toBeUndefined();
});

test('avatar rejects oversized files, SVG, and files whose contents do not match the image type', async () => {
  const account = await user();
  const bearer = auth(account);
  const send = (buffer, contentType) =>
    request(app)
      .post('/api/v1/profile/avatar')
      .set('Authorization', bearer)
      .attach('avatar', buffer, { filename: 'avatar.png', contentType });
  expect((await send(Buffer.alloc(2 * 1024 * 1024 + 1), 'image/png')).status).toBe(413);
  expect((await send(Buffer.from('<svg></svg>'), 'image/svg+xml')).status).toBe(400);
  expect((await send(Buffer.from('<script>bad</script>'), 'image/png')).status).toBe(400);
  expect((await UserModel.findById(account.id)).avatarUrl).toBeUndefined();
});

test('changing password requires the current password and revokes old access and refresh tokens', async () => {
  const account = await user();
  const tokens = tokensForUser(account);
  const change = (input) =>
    request(app)
      .post('/api/v1/profile/password')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .send(input);
  expect((await change({ currentPassword: 'wrong', newPassword })).status).toBe(400);
  expect((await change({ currentPassword, newPassword: currentPassword })).status).toBe(400);
  expect((await change({ currentPassword, newPassword: 'short' })).status).toBe(400);
  expect((await change({ currentPassword, newPassword })).status).toBe(200);
  expect(
    (await request(app).get('/api/v1/profile').set('Authorization', `Bearer ${tokens.accessToken}`))
      .status,
  ).toBe(401);
  expect(
    (await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken }))
      .status,
  ).toBe(401);
  expect(
    (
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: account.email, password: currentPassword })
    ).status,
  ).toBe(401);
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: account.email, password: newPassword });
  expect(login.status).toBe(200);
  expect(login.body.data.user.orgId).toBeNull();
});

test('Google-only accounts use email verification to set a password; legacy linked accounts are not misclassified', async () => {
  const google = await user({ googleSubject: 'profile-google-subject', hasPassword: false });
  const response = await request(app).get('/api/v1/profile').set('Authorization', auth(google));
  expect(response.body.data.user).toMatchObject({ hasPassword: false, googleLinked: true });
  expect(
    (
      await request(app)
        .post('/api/v1/profile/password')
        .set('Authorization', auth(google))
        .send({ currentPassword, newPassword })
    ).status,
  ).toBe(400);
  const legacy = await user({ googleSubject: 'legacy-profile-google' });
  const legacyProfile = await request(app)
    .get('/api/v1/profile')
    .set('Authorization', auth(legacy));
  expect(legacyProfile.body.data.user.hasPassword).toBeNull();
});
