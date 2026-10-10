process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'invitation-tests-access';
process.env.JWT_REFRESH_SECRET = 'invitation-tests-refresh';
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_FROM = 'test@example.com';
process.env.MONGOMS_DOWNLOAD_DIR = require('path').join(
  __dirname,
  '../node_modules/.cache/mongodb-memory-server',
);

jest.mock('../dist/services/invitationEmail.service', () => ({
  ensureInvitationEmailConfigured: jest.fn(),
  sendInvitationEmail: jest.fn().mockResolvedValue(undefined),
}));

const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createHash } = require('crypto');
const { createApp } = require('../dist/app');
const { UserModel } = require('../dist/models/user.model');
const { OrganizationModel } = require('../dist/models/organization.model');
const {
  OrganizationInvitationModel: Invitations,
} = require('../dist/models/organizationInvitation.model');
const { seedDefaultRoles, getRoleByCode } = require('../dist/services/role.service');
const { tokensForUser } = require('../dist/services/auth.service');
const { sendInvitationEmail } = require('../dist/services/invitationEmail.service');

let repl, app, org, owner, ownerToken;
let sequence = 0;
async function makeUser(role = 'user', orgId, email = `user${++sequence}@example.com`) {
  const roleDoc = await getRoleByCode(role);
  return (
    await UserModel.create({
      name: 'Test user',
      email,
      passwordHash: 'unused',
      roleId: roleDoc._id,
      orgId,
    })
  ).populate('roleId');
}
const bearer = (user) => `Bearer ${tokensForUser(user).accessToken}`;
async function invite(email = `invite${++sequence}@example.com`, role = 'staff') {
  const response = await request(app)
    .post(`/api/v1/organizations/${org.id}/invitations`)
    .set('Authorization', ownerToken)
    .send({ email, role });
  expect(response.status).toBe(201);
  return { token: sendInvitationEmail.mock.calls.at(-1)[0].token, email, data: response.body.data };
}
function accept(user, token) {
  return request(app)
    .post('/api/v1/invitations/accept')
    .set('Authorization', bearer(user))
    .send({ token });
}

beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  await seedDefaultRoles();
  await Promise.all([UserModel.init(), Invitations.init(), OrganizationModel.init()]);
  org = await OrganizationModel.create({ name: 'Test company' });
  owner = await makeUser('owner', org._id);
  ownerToken = bearer(owner);
  app = createApp();
});
afterAll(async () => {
  await mongoose.disconnect();
  if (repl) await repl.stop();
});

test('owner sends normalized email; registration, preview, acceptance and member listing work', async () => {
  const invitation = await invite('NEW-MEMBER@EXAMPLE.COM', 'reviewer');
  expect(sendInvitationEmail.mock.calls.at(-1)[0].email).toBe('new-member@example.com');
  expect(JSON.stringify(invitation.data)).not.toContain(invitation.token);
  const stored = await Invitations.findById(invitation.data.id).select('+tokenHash');
  expect(stored.tokenHash).toBe(createHash('sha256').update(invitation.token).digest('hex'));
  const preview = await request(app)
    .post('/api/v1/invitations/preview')
    .send({ token: invitation.token });
  expect(preview.status).toBe(200);
  expect(preview.body.data.organizationName).toBe(org.name);
  const signup = await request(app)
    .post('/api/v1/auth/register')
    .send({
      name: 'New member',
      email: invitation.email,
      password: 'password123',
      invitationToken: invitation.token,
    });
  expect(signup.status).toBe(201);
  expect(signup.body.data.user.orgId).toBeNull();
  const result = await request(app)
    .post('/api/v1/invitations/accept')
    .set('Authorization', `Bearer ${signup.body.data.accessToken}`)
    .send({ token: invitation.token });
  expect(result.status).toBe(200);
  expect(result.body.data.user).toMatchObject({
    orgId: org.id,
    role: 'reviewer',
    hasCompletedOnboarding: true,
  });
  expect(jwt.verify(result.body.data.accessToken, process.env.JWT_ACCESS_SECRET)).toMatchObject({
    orgId: org.id,
    role: 'reviewer',
  });
  expect((await Invitations.findById(stored.id)).status).toBe('accepted');
  const members = await request(app)
    .get(`/api/v1/organizations/${org.id}/members`)
    .set('Authorization', ownerToken);
  expect(members.body.data.some((member) => member.email === 'new-member@example.com')).toBe(true);
  const list = await request(app)
    .get(`/api/v1/organizations/${org.id}/invitations`)
    .set('Authorization', ownerToken);
  expect(JSON.stringify(list.body)).not.toContain('tokenHash');
  const replay = await request(app)
    .post('/api/v1/invitations/accept')
    .set('Authorization', `Bearer ${result.body.data.accessToken}`)
    .send({ token: invitation.token });
  expect(replay.status).toBe(400);
  const oldAccess = await request(app)
    .get('/api/v1/contracts')
    .set('Authorization', `Bearer ${signup.body.data.accessToken}`);
  expect(oldAccess.status).toBe(401);
});

test('non-owner, cross-organization owner and invalid roles cannot invite', async () => {
  const staff = await makeUser('staff', org._id);
  const another = await OrganizationModel.create({ name: 'Another company' });
  const otherOwner = await makeUser('owner', another._id);
  for (const user of [staff, otherOwner]) {
    const response = await request(app)
      .post(`/api/v1/organizations/${org.id}/invitations`)
      .set('Authorization', bearer(user))
      .send({ email: 'forbidden@example.com', role: 'staff' });
    expect(response.status).toBe(403);
  }
  for (const role of ['owner', 'administrator']) {
    const response = await request(app)
      .post(`/api/v1/organizations/${org.id}/invitations`)
      .set('Authorization', ownerToken)
      .send({ email: 'forbidden@example.com', role });
    expect(response.status).toBe(400);
  }
});

test('wrong email, expired invitation and revoked invitation cannot be accepted', async () => {
  const invitation = await invite();
  const wrong = await makeUser();
  expect((await accept(wrong, invitation.token)).status).toBe(403);
  const intended = await makeUser('user', undefined, invitation.email);
  await Invitations.updateOne({ _id: invitation.data.id }, { $set: { expiresAt: new Date(0) } });
  expect((await accept(intended, invitation.token)).status).toBe(400);
  const fresh = await invite(invitation.email);
  const revoked = await request(app)
    .delete(`/api/v1/organizations/${org.id}/invitations/${fresh.data.id}`)
    .set('Authorization', ownerToken);
  expect(revoked.status).toBe(200);
  expect((await accept(intended, fresh.token)).status).toBe(400);
  expect((await UserModel.findById(intended.id)).orgId).toBeUndefined();
});

test('existing personal/company organization blocks acceptance without consuming invitation', async () => {
  const invitation = await invite();
  const personal = await OrganizationModel.create({ name: 'Personal', isPersonal: true });
  const user = await makeUser('user', personal._id, invitation.email);
  expect((await accept(user, invitation.token)).status).toBe(409);
  expect((await UserModel.findById(user.id)).orgId.toString()).toBe(personal.id);
  expect((await Invitations.findById(invitation.data.id)).status).toBe('pending');
  const blocked = await request(app)
    .post(`/api/v1/organizations/${org.id}/invitations`)
    .set('Authorization', ownerToken)
    .send({ email: user.email, role: 'staff' });
  expect(blocked.status).toBe(409);
});

test('duplicate pending invitations are blocked; email failure permits retry', async () => {
  const invitation = await invite();
  const duplicate = await request(app)
    .post(`/api/v1/organizations/${org.id}/invitations`)
    .set('Authorization', ownerToken)
    .send({ email: invitation.email, role: 'manager' });
  expect(duplicate.status).toBe(409);
  const { AppError } = require('../dist/errors/AppError');
  sendInvitationEmail.mockRejectedValueOnce(new AppError('SMTP unavailable', 502));
  const failed = await request(app)
    .post(`/api/v1/organizations/${org.id}/invitations`)
    .set('Authorization', ownerToken)
    .send({ email: 'retry@example.com', role: 'staff' });
  expect(failed.status).toBe(502);
  expect((await Invitations.findOne({ email: 'retry@example.com' })).status).toBe(
    'delivery_failed',
  );
  await invite('retry@example.com');
});

test('concurrent acceptance consumes an invitation only once', async () => {
  const invitation = await invite();
  const user = await makeUser('user', undefined, invitation.email);
  const responses = await Promise.all([
    accept(user, invitation.token),
    accept(user, invitation.token),
  ]);
  expect(responses.filter((response) => response.status === 200)).toHaveLength(1);
  expect(responses.every((response) => [200, 400, 401, 409].includes(response.status))).toBe(true);
  expect((await UserModel.findById(user.id)).orgId.toString()).toBe(org.id);
});

test('invitation login and refresh skip automatic personal workspace creation', async () => {
  const invitation = await invite();
  const registration = await request(app).post('/api/v1/auth/register').send({
    name: 'Existing user',
    email: invitation.email,
    password: 'password123',
  });
  await UserModel.updateOne(
    { _id: registration.body.data.user.id },
    { $set: { hasCompletedOnboarding: true } },
  );
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: invitation.email, password: 'password123', invitationToken: invitation.token, remember: true });
  expect(login.status).toBe(200);
  expect(login.body.data.user.orgId).toBeNull();
  const refresh = await request(app).post('/api/v1/auth/refresh').send({
    refreshToken: login.body.data.refreshToken,
    invitationToken: invitation.token,
  });
  expect(refresh.status).toBe(200);
  expect(refresh.body.data.user.email).toBe(invitation.email);
  expect(jwt.verify(refresh.body.data.refreshToken, process.env.JWT_REFRESH_SECRET).remember).toBe(true);
  expect((await UserModel.findById(registration.body.data.user.id)).orgId).toBeUndefined();
});

test('simultaneous invitations from two organizations can only assign one organization', async () => {
  const first = await invite();
  const otherOrg = await OrganizationModel.create({ name: 'Competing company' });
  const otherOwner = await makeUser('owner', otherOrg._id);
  const second = await request(app)
    .post(`/api/v1/organizations/${otherOrg.id}/invitations`)
    .set('Authorization', bearer(otherOwner))
    .send({ email: first.email, role: 'manager' });
  expect(second.status).toBe(201);
  const secondToken = sendInvitationEmail.mock.calls.at(-1)[0].token;
  const user = await makeUser('user', undefined, first.email);
  const responses = await Promise.all([accept(user, first.token), accept(user, secondToken)]);
  expect(responses.filter((response) => response.status === 200)).toHaveLength(1);
  expect(responses.every((response) => [200, 401, 409].includes(response.status))).toBe(true);
  const invitations = await Invitations.find({ email: first.email });
  expect(invitations.filter((item) => item.status === 'accepted')).toHaveLength(1);
  expect(invitations.filter((item) => item.status === 'pending')).toHaveLength(1);
  const updated = await UserModel.findById(user.id);
  expect(updated.orgId.toString()).toBe(
    invitations.find((item) => item.status === 'accepted').orgId.toString(),
  );
});

test('acceptance racing organization deletion never leaves an orphan member', async () => {
  const otherOrg = await OrganizationModel.create({ name: 'Deletable company' });
  const otherOwner = await makeUser('owner', otherOrg._id);
  const email = 'delete-race@example.com';
  const sent = await request(app)
    .post(`/api/v1/organizations/${otherOrg.id}/invitations`)
    .set('Authorization', bearer(otherOwner))
    .send({ email, role: 'staff' });
  expect(sent.status).toBe(201);
  const token = sendInvitationEmail.mock.calls.at(-1)[0].token;
  const user = await makeUser('user', undefined, email);
  await Promise.all([
    accept(user, token),
    request(app)
      .delete(`/api/v1/organizations/${otherOrg.id}`)
      .set('Authorization', bearer(otherOwner)),
  ]);
  const updated = await UserModel.findById(user.id);
  if (updated.orgId) expect(await OrganizationModel.exists({ _id: updated.orgId })).toBeTruthy();
  else expect((await Invitations.findById(sent.body.data.id)).status).toBe('revoked');
});
