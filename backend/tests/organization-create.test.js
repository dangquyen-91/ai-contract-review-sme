// Unit test cases for ORG-01 createOrganization (UTCID01–UTCID10 in the test-case sheet).
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'organization-create-access';
process.env.JWT_REFRESH_SECRET = 'organization-create-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const request = require('supertest');
const { createApp } = require('../dist/app');
const { logger } = require('../dist/config/logger');
logger.silent = true;
const { UserModel } = require('../dist/models/user.model');
const { OrganizationModel } = require('../dist/models/organization.model');
const { IndustryModel } = require('../dist/models/industry.model');
const { MembershipModel } = require('../dist/models/membership.model');
const { SubscriptionPeriodModel, initializeSubscriptionModels } = require('../dist/models/subscription.model');
const { seedDefaultRoles } = require('../dist/services/identity/role.service');
const { createAccount } = require('./helpers/accounts');

let repl, app, sequence = 0;
const DAY = 24 * 60 * 60 * 1000;
const valid = {
  name: '  Công ty Minh Tâm  ',
  taxCode: '0312345678',
  industry: 'org-create-industry',
  addressDetails: { provinceCode: '01', wardCode: '00004', addressLine: '  12 Hoàng Hoa Thám  ' },
};
const account = (role = 'user', orgId) =>
  createAccount({ role, orgId, name: 'Org creator', email: `org-create-${++sequence}@example.com` });
const create = (user, body) =>
  request(app)
    .post('/api/v1/organizations')
    .set('Authorization', `Bearer ${user.testSession.accessToken}`)
    .send(body);
const errorOf = (response) => response.body.error.message;

beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  await seedDefaultRoles();
  await initializeSubscriptionModels();
  await Promise.all([UserModel.init(), MembershipModel.init()]);
  await IndustryModel.create({ code: 'org-create-industry', name: 'Test industry' });
  app = createApp();
});
afterAll(async () => {
  await mongoose.disconnect();
  if (repl) await repl.stop();
});

async function expectNothingCreated(user, before) {
  expect(await OrganizationModel.countDocuments()).toBe(before);
  expect(await MembershipModel.exists({ userId: user._id })).toBeNull();
}

test('UTCID01: a personal user creates an organization, becomes Owner and receives the 7-day trial', async () => {
  const user = await account();
  const response = await create(user, valid);
  expect(response.status).toBe(201);
  const organization = await OrganizationModel.findById(response.body.data.id ?? response.body.data._id);
  expect(organization.toObject()).toMatchObject({
    name: 'Công ty Minh Tâm',
    taxCode: '0312345678',
    address: '12 Hoàng Hoa Thám, Phường Ba Đình, Thành phố Hà Nội',
  });
  expect(await MembershipModel.findOne({ userId: user._id }).lean()).toMatchObject({ orgId: organization._id, role: 'owner' });
  expect((await UserModel.findById(user.id)).hasCompletedOnboarding).toBe(true);
  const trial = await SubscriptionPeriodModel.findOne({ key: `trial:${user.id}` }).lean();
  expect(String(trial.orgId)).toBe(organization.id);
  expect(trial.plan).toMatchObject({ code: 'business_trial', analysisLimit: 5, chatLimit: 30, draftingLimit: 5 });
  expect(trial.endsAt - trial.startsAt).toBe(7 * DAY);
});

test('UTCID02: a tax code with a 3-digit branch code is accepted', async () => {
  const user = await account();
  const response = await create(user, { ...valid, taxCode: '0312345678-001' });
  expect(response.status).toBe(201);
});

test('UTCID03: a 9-digit tax code is rejected', async () => {
  const user = await account();
  const before = await OrganizationModel.countDocuments();
  const response = await create(user, { ...valid, taxCode: '031234567' });
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Mã số thuế gồm 10 chữ số hoặc 10 chữ số và mã chi nhánh 3 chữ số.');
  await expectNothingCreated(user, before);
});

test('UTCID04: a 1-character name is rejected', async () => {
  const user = await account();
  const before = await OrganizationModel.countDocuments();
  const response = await create(user, { ...valid, name: 'A' });
  expect(response.status).toBe(400);
  await expectNothingCreated(user, before);
});

test('UTCID05: an unknown industry is rejected without leaving an organization behind', async () => {
  const user = await account();
  const before = await OrganizationModel.countDocuments();
  const response = await create(user, { ...valid, industry: 'nonexistent-industry' });
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Ngành kinh doanh không hợp lệ. Vui lòng chọn lại.');
  await expectNothingCreated(user, before);
});

test('UTCID06: a ward outside the selected province is rejected', async () => {
  const user = await account();
  const before = await OrganizationModel.countDocuments();
  const response = await create(user, {
    ...valid,
    addressDetails: { ...valid.addressDetails, provinceCode: '79' },
  });
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Xã/phường không thuộc tỉnh/thành phố đã chọn.');
  await expectNothingCreated(user, before);
});

test('UTCID07: only a name without tax code, industry or address is rejected', async () => {
  const user = await account();
  const before = await OrganizationModel.countDocuments();
  const response = await create(user, { name: 'Nhóm mới' });
  expect(response.status).toBe(400);
  await expectNothingCreated(user, before);
});

test('UTCID08: an Owner who already has an organization cannot create another', async () => {
  const first = await OrganizationModel.create({ name: 'Existing company' });
  const owner = await account('owner', first._id);
  const before = await OrganizationModel.countDocuments();
  const response = await create(owner, valid);
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Requires role: user');
  expect(await OrganizationModel.countDocuments()).toBe(before);
});

test('UTCID09: a system account (Manager) cannot create an organization', async () => {
  const manager = await account('manager');
  const response = await create(manager, valid);
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Requires role: user');
});

test('UTCID10: the free trial is granted only once per owner', async () => {
  const user = await account();
  const first = await create(user, valid);
  expect(first.status).toBe(201);
  const orgId = first.body.data.id ?? first.body.data._id;
  // The owner leaves (organization deleted) and creates a new organization.
  await MembershipModel.deleteOne({ userId: user._id });
  await OrganizationModel.deleteOne({ _id: orgId });
  await UserModel.updateOne({ _id: user._id }, { $inc: { permissionsVersion: 1 } });
  const fresh = await UserModel.findById(user.id);
  const { sessionFor } = require('../dist/services/identity/auth.service');
  const second = await request(app)
    .post('/api/v1/organizations')
    .set('Authorization', `Bearer ${(await sessionFor(fresh, true)).accessToken}`)
    .send(valid);
  expect(second.status).toBe(201);
  const newOrgId = second.body.data.id ?? second.body.data._id;
  expect(await SubscriptionPeriodModel.countDocuments({ key: `trial:${user.id}` })).toBe(1);
  expect(await SubscriptionPeriodModel.exists({ orgId: newOrgId })).toBeNull();
});
