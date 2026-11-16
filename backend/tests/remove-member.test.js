process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'remove-member-test-access';
process.env.JWT_REFRESH_SECRET = 'remove-member-test-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.GEMINI_API_KEY = '';
process.env.MONGOMS_DOWNLOAD_DIR = require('path').join(
  __dirname,
  '../node_modules/.cache/mongodb-memory-server',
);

jest.mock('../dist/services/organization/invitationEmail.service', () => ({
  ensureInvitationEmailConfigured: jest.fn(),
  sendInvitationEmail: jest.fn().mockResolvedValue(undefined),
}));

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { createApp } = require('../dist/app');
const { logger } = require('../dist/config/logger');
logger.silent = true;
const { UserModel } = require('../dist/models/user.model');
const { OrganizationModel } = require('../dist/models/organization.model');
const { IndustryModel } = require('../dist/models/industry.model');
const { OrganizationInvitationModel } = require('../dist/models/organizationInvitation.model');
const { ContractModel } = require('../dist/models/contract.model');
const { ContractVersionModel } = require('../dist/models/contractVersion.model');
const { ChatMessageModel } = require('../dist/models/chatMessage.model');
const {
  initializeSubscriptionModels,
  SubscriptionPeriodModel,
} = require('../dist/models/subscription.model');
const { seedDefaultRoles, getRoleByCode } = require('../dist/services/identity/role.service');
const { tokensForUser } = require('../dist/services/identity/auth.service');
const {
  seedPlans,
  activatePaidSubscription,
  getSubscription,
} = require('../dist/services/billing/subscription.service');
const {
  createInvitation,
  acceptInvitation,
} = require('../dist/services/organization/invitation.service');
const { sendInvitationEmail } = require('../dist/services/organization/invitationEmail.service');

let replica,
  app,
  passwordHash,
  serial = 0;
const password = 'TestMemberPassword123!';
const bearer = (user) => `Bearer ${tokensForUser(user).accessToken}`;
async function user(role, orgId) {
  const roleDoc = await getRoleByCode(role);
  return (
    await UserModel.create({
      name: 'Member Test',
      email: `remove-${++serial}@example.com`,
      passwordHash,
      emailVerifiedAt: new Date(),
      roleId: roleDoc._id,
      orgId,
      hasCompletedOnboarding: true,
    })
  ).populate('roleId');
}
async function team() {
  const org = await OrganizationModel.create({ name: 'Removal test company' });
  return { org, owner: await user('owner', org._id) };
}
function remove(owner, orgId, memberId) {
  return request(app)
    .delete(`/api/v1/organizations/${orgId}/members/${memberId}`)
    .set('Authorization', bearer(owner));
}
async function invitation(owner, org, email) {
  await createInvitation(owner.id, org.id, { email, role: 'staff' });
  return sendInvitationEmail.mock.calls.at(-1)[0].token;
}

test('creating a business saves its name, tax code, address and validated industry together', async () => {
  const personal = await user('user');
  await IndustryModel.create({ code: 'organization-create-fixture', name: 'Test industry' });
  const response = await request(app).post('/api/v1/organizations').set('Authorization', bearer(personal)).send({
    name: '  Công ty Minh Tâm  ', taxCode: '  0312345678  ', industry: 'organization-create-fixture',
    addressDetails: { provinceCode: '01', wardCode: '00004', addressLine: '  12 Hoàng Hoa Thám  ' },
  });
  expect(response.status).toBe(201);
  const organization = await OrganizationModel.findById(response.body.data.id ?? response.body.data._id);
  expect(organization.toObject()).toMatchObject({ name: 'Công ty Minh Tâm', taxCode: '0312345678', address: '12 Hoàng Hoa Thám, Phường Ba Đình, Thành phố Hà Nội', industry: 'organization-create-fixture', isPersonal: false, addressDetails: { provinceCode: '01', provinceName: 'Thành phố Hà Nội', wardCode: '00004', wardName: 'Phường Ba Đình', addressLine: '12 Hoàng Hoa Thám' } });
  const updated = await UserModel.findById(personal.id).populate('roleId');
  expect(updated.orgId.toString()).toBe(organization.id);
  expect(updated.roleId.code).toBe('owner');
  expect(updated.hasCompletedOnboarding).toBe(true);
});

test('creating a business rejects an unknown industry without creating an orphan organization', async () => {
  const personal = await user('user');
  const before = await OrganizationModel.countDocuments();
  const response = await request(app).post('/api/v1/organizations').set('Authorization', bearer(personal)).send({ name: 'Business', taxCode: '0312345678', industry: 'nonexistent-industry', addressDetails: { provinceCode: '01', wardCode: '00004', addressLine: '12 Hoàng Hoa Thám' } });
  expect(response.status).toBe(400);
  expect(await OrganizationModel.countDocuments()).toBe(before);
  expect((await UserModel.findById(personal.id)).orgId ?? null).toBeNull();
});

test('business creation requires tax code, address and industry instead of accepting only a name', async () => {
  const personal = await user('user');
  const response = await request(app).post('/api/v1/organizations').set('Authorization', bearer(personal)).send({ name: 'Nhóm mới' });
  expect(response.status).toBe(400);
  expect((await UserModel.findById(personal.id)).orgId ?? null).toBeNull();
});

test('address directory includes all 34 provinces and 3321 wards; mismatched addresses are rejected before creating a business', async () => {
  const personal = await user('user');
  const directory = await request(app).get('/api/v1/organizations/address-options').set('Authorization', bearer(personal));
  expect(directory.status).toBe(200);
  const provinces = directory.body.data.provinces;
  expect(provinces).toHaveLength(34);
  expect(provinces.reduce((sum, province) => sum + province.wards.length, 0)).toBe(3321);
  const payload = { name: 'Test business', taxCode: '0312345678', industry: 'organization-create-fixture', addressDetails: { provinceCode: '79', wardCode: '00004', addressLine: '12 Test' } };
  const before = await OrganizationModel.countDocuments();
  for (const invalid of [payload, { ...payload, taxCode: '' }, { ...payload, addressDetails: { ...payload.addressDetails, provinceCode: '01', addressLine: '' } }]) {
    const response = await request(app).post('/api/v1/organizations').set('Authorization', bearer(personal)).send(invalid);
    expect(response.status).toBe(400);
  }
  expect(await OrganizationModel.countDocuments()).toBe(before);
});

test('deleting the last-owner organization restores the same personal account and keeps its refresh session', async () => {
  const { org, owner } = await team();
  const previous = tokensForUser(owner, true);
  const otherOrg = await OrganizationModel.create({ name: 'Unchanged company' });
  const unrelated = await user('owner', otherOrg._id);
  await invitation(owner, org, 'deleted-org-invite@example.com');
  const response = await request(app).delete(`/api/v1/organizations/${org.id}`).set('Authorization', `Bearer ${previous.accessToken}`);
  expect(response.status).toBe(204);
  expect(await OrganizationModel.findById(org.id)).toBeNull();
  const updated = await UserModel.findById(owner.id).select('+passwordHash').populate('roleId');
  expect(updated.roleId.code).toBe('user');
  expect(updated.orgId ?? null).toBeNull();
  expect(updated.hasCompletedOnboarding).toBe(true);
  expect(updated.email).toBe(owner.email);
  expect(updated.passwordHash).toBe(owner.passwordHash);
  expect(updated.authVersion ?? 0).toBe(owner.authVersion ?? 0);
  expect(updated.permissionsVersion).toBe((owner.permissionsVersion ?? 0) + 1);
  expect((await OrganizationInvitationModel.findOne({ orgId: org.id })).status).toBe('revoked');
  expect((await request(app).get('/api/v1/profile').set('Authorization', `Bearer ${previous.accessToken}`)).status).toBe(401);
  const refreshed = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: previous.refreshToken });
  expect(refreshed.status).toBe(200);
  expect(refreshed.body.data.user).toMatchObject({ id: owner.id, role: 'user', orgId: null, hasCompletedOnboarding: true });
  expect((await request(app).get('/api/v1/profile').set('Authorization', `Bearer ${refreshed.body.data.accessToken}`)).status).toBe(200);
  expect((await request(app).get(`/api/v1/organizations/${otherOrg.id}`).set('Authorization', `Bearer ${refreshed.body.data.accessToken}`)).status).toBe(403);
  expect((await UserModel.findById(unrelated.id)).orgId.toString()).toBe(otherOrg.id);
});

test('refresh recovers legacy Owner accounts left without an organization without requiring onboarding again', async () => {
  const legacy = await user('owner');
  await UserModel.updateOne({ _id: legacy.id }, { $set: { hasCompletedOnboarding: false } });
  const previous = tokensForUser(legacy);
  const response = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: previous.refreshToken });
  expect(response.status).toBe(200);
  expect(response.body.data.user).toMatchObject({ id: legacy.id, role: 'user', orgId: null, hasCompletedOnboarding: true });
  const repaired = await UserModel.findById(legacy.id);
  expect(repaired.permissionsVersion).toBe(1);
  const repeated = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: previous.refreshToken });
  expect(repeated.status).toBe(200);
  expect((await UserModel.findById(legacy.id)).permissionsVersion).toBe(1);
});

test.each(['member', 'contract'])('failed organization deletion with a remaining %s preserves membership and the session', async resource => {
  const { org, owner } = await team();
  const previous = tokensForUser(owner);
  if (resource === 'member') await user('staff', org._id);
  else await ContractModel.create({ orgId: org._id, uploadedBy: owner._id, title: 'Protected contract' });
  const response = await request(app).delete(`/api/v1/organizations/${org.id}`).set('Authorization', `Bearer ${previous.accessToken}`);
  expect(response.status).toBe(409);
  const updated = await UserModel.findById(owner.id).populate('roleId');
  expect(updated.roleId.code).toBe('owner');
  expect(updated.orgId.toString()).toBe(org.id);
  expect(updated.permissionsVersion ?? 0).toBe(owner.permissionsVersion ?? 0);
  expect(await OrganizationModel.exists({ _id: org.id })).toBeTruthy();
  const refreshed = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: previous.refreshToken });
  expect(refreshed.status).toBe(200);
  expect(refreshed.body.data.user).toMatchObject({ role: 'owner', orgId: org.id });
});

beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replica.getUri());
  await seedDefaultRoles();
  await initializeSubscriptionModels();
  await seedPlans();
  await Promise.all([
    UserModel.init(),
    OrganizationModel.init(),
    OrganizationInvitationModel.init(),
  ]);
  passwordHash = await bcrypt.hash(password, 4);
  app = createApp();
});
afterAll(async () => {
  await mongoose.disconnect();
  if (replica) await replica.stop();
});

test('removal frees one paid seat while retaining the account, organization data, plan and usage', async () => {
  const { org, owner } = await team();
  const staff = await user('staff', org._id);
  await Promise.all(['manager', 'expert', 'staff'].map((role) => user(role, org._id)));
  const paid = await activatePaidSubscription({
    orgId: org.id,
    planCode: 'business_starter',
    amount: 499000,
    paymentReference: org.id,
    action: 'purchase',
  });
  await SubscriptionPeriodModel.updateOne(
    { _id: paid._id },
    { $set: { analysisUsed: 7, chatUsed: 11 } },
  );
  const before = await SubscriptionPeriodModel.findById(paid._id).lean();
  const contract = await ContractModel.create({
    orgId: org._id,
    uploadedBy: staff._id,
    title: 'Retained contract',
    type: 'service',
  });
  const version = await ContractVersionModel.create({
    contractId: contract._id,
    versionNumber: 1,
    createdBy: staff._id,
    extractedText: 'Private organization text',
  });
  const chat = await ChatMessageModel.create({
    contractVersionId: version._id,
    orgId: org._id,
    userId: staff._id,
    role: 'user',
    content: 'Retained chat',
  });
  expect((await getSubscription(owner.id, org.id)).members).toMatchObject({
    count: 5,
    limit: 5,
    available: 0,
  });
  const response = await remove(owner, org.id, staff.id);
  expect(response.status).toBe(204);
  expect(response.text).toBe('');
  const removed = await UserModel.findById(staff.id).populate('roleId');
  expect(removed.orgId).toBeUndefined();
  expect(removed.roleId.code).toBe('user');
  expect(removed.isActive).toBe(true);
  expect(removed.hasCompletedOnboarding).toBe(false);
  expect(removed.permissionsVersion).toBe(1);
  expect(await SubscriptionPeriodModel.findById(paid._id).lean()).toEqual(before);
  expect((await ContractModel.findById(contract.id)).uploadedBy.toString()).toBe(staff.id);
  expect(
    (await ContractVersionModel.findById(version.id).select('+extractedText')).extractedText,
  ).toBe('Private organization text');
  expect((await ChatMessageModel.findById(chat.id)).content).toBe('Retained chat');
  expect(
    (await request(app).get(`/api/v1/contracts/${contract.id}`).set('Authorization', bearer(owner)))
      .status,
  ).toBe(200);
  expect((await getSubscription(owner.id, org.id)).members).toMatchObject({
    count: 4,
    limit: 5,
    available: 1,
  });
  const replacement = await user('user');
  const token = await invitation(owner, org, replacement.email);
  expect((await getSubscription(owner.id, org.id)).members).toMatchObject({
    count: 4,
    pending: 1,
    available: 0,
  });
  await acceptInvitation(replacement.id, token);
  expect((await getSubscription(owner.id, org.id)).members).toMatchObject({
    count: 5,
    pending: 0,
    limit: 5,
    available: 0,
  });
});

test('old access stays invalid even after rejoining the same org with the same role', async () => {
  const { org, owner } = await team();
  const staff = await user('staff', org._id);
  const old = tokensForUser(staff);
  expect((await remove(owner, org.id, staff.id)).status).toBe(204);
  const path = `/api/v1/organizations/${org.id}`;
  expect(
    (await request(app).get(path).set('Authorization', `Bearer ${old.accessToken}`)).status,
  ).toBe(401);
  const refreshed = await request(app)
    .post('/api/v1/auth/refresh')
    .send({ refreshToken: old.refreshToken });
  expect(refreshed.status).toBe(200);
  expect(refreshed.body.data.user.orgId).toBeNull();
  expect(refreshed.body.data.user.hasCompletedOnboarding).toBe(false);
  expect(
    (await request(app).get(path).set('Authorization', `Bearer ${refreshed.body.data.accessToken}`))
      .status,
  ).toBe(403);
  const loggedIn = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: staff.email, password });
  expect(loggedIn.status).toBe(200);
  expect(loggedIn.body.data.user.orgId).toBeNull();
  const token = await invitation(owner, org, staff.email);
  const accepted = await request(app)
    .post('/api/v1/invitations/accept')
    .set('Authorization', `Bearer ${loggedIn.body.data.accessToken}`)
    .send({ token });
  expect(accepted.status).toBe(200);
  expect(
    (await request(app).get(path).set('Authorization', `Bearer ${old.accessToken}`)).status,
  ).toBe(401);
  expect(
    (await request(app).get(path).set('Authorization', `Bearer ${accepted.body.data.accessToken}`))
      .status,
  ).toBe(200);
  const again = await request(app)
    .post('/api/v1/auth/refresh')
    .send({ refreshToken: accepted.body.data.refreshToken });
  expect(
    (await request(app).get(path).set('Authorization', `Bearer ${again.body.data.accessToken}`))
      .status,
  ).toBe(200);
  const loginAgain = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: staff.email, password });
  expect(
    (
      await request(app)
        .get(path)
        .set('Authorization', `Bearer ${loginAgain.body.data.accessToken}`)
    ).status,
  ).toBe(200);
});

test('only the organization owner can remove members; owner and cross-org targets are protected', async () => {
  const { org, owner } = await team();
  const other = await team();
  const staff = await user('staff', org._id);
  expect(
    (await request(app).delete(`/api/v1/organizations/${org.id}/members/${staff.id}`)).status,
  ).toBe(401);
  for (const role of ['staff', 'manager', 'expert', 'administrator', 'user']) {
    expect((await remove(await user(role, org._id), org.id, staff.id)).status).toBe(403);
  }
  expect((await remove(other.owner, org.id, staff.id)).status).toBe(403);
  expect((await remove(owner, org.id, other.owner.id)).status).toBe(404);
  expect((await remove(owner, org.id, owner.id)).status).toBe(409);
  const secondOwner = await user('owner', org._id);
  expect((await remove(owner, org.id, secondOwner.id)).status).toBe(409);
  expect((await remove(owner, org.id, 'invalid')).status).toBe(400);
  expect((await remove(owner, 'invalid', staff.id)).status).toBe(400);
  expect((await UserModel.findById(staff.id)).orgId.toString()).toBe(org.id);
});

test('concurrent deletion frees only one seat and another organization can invite the removed user', async () => {
  const { org, owner } = await team();
  const staff = await user('staff', org._id);
  const results = await Promise.all([
    remove(owner, org.id, staff.id),
    remove(owner, org.id, staff.id),
  ]);
  expect(results.map((r) => r.status).sort()).toEqual([204, 404]);
  expect((await UserModel.findById(staff.id)).permissionsVersion).toBe(1);
  expect((await getSubscription(owner.id, org.id)).members).toMatchObject({
    count: 1,
    limit: 3,
    available: 2,
  });
  const other = await team();
  const token = await invitation(other.owner, other.org, staff.email);
  await acceptInvitation(staff.id, token);
  expect((await UserModel.findById(staff.id)).orgId.toString()).toBe(other.org.id);
});

test('legacy access tokens work before removal and are rejected afterwards', async () => {
  const { org, owner } = await team();
  const staff = await user('staff', org._id);
  await UserModel.updateOne({ _id: staff._id }, { $unset: { permissionsVersion: 1 } });
  const token = require('jsonwebtoken').sign(
    { sub: staff.id, role: 'staff', orgId: org.id },
    process.env.JWT_ACCESS_SECRET,
  );
  const path = `/api/v1/organizations/${org.id}`;
  expect((await request(app).get(path).set('Authorization', `Bearer ${token}`)).status).toBe(200);
  expect((await remove(owner, org.id, staff.id)).status).toBe(204);
  expect((await request(app).get(path).set('Authorization', `Bearer ${token}`)).status).toBe(401);
});
