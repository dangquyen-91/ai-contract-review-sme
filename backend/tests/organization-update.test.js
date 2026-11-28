// Unit test cases for ORG-03 updateOrganization (UTCID01–UTCID11 in the test-case sheet).
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'organization-update-access';
process.env.JWT_REFRESH_SECRET = 'organization-update-refresh';
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
const { seedDefaultRoles } = require('../dist/services/identity/role.service');
const { createAccount } = require('./helpers/accounts');

let repl, app, sequence = 0, otherCompany;
const original = {
  name: 'Công ty Minh Tâm',
  taxCode: '0312345678',
  industry: 'org-update-retail',
  address: '12 Hoàng Hoa Thám, Phường Ba Đình, Thành phố Hà Nội',
};
const account = (role, orgId) =>
  createAccount({ role, orgId, name: 'Org editor', email: `org-update-${++sequence}@example.com` });
async function ownerWithCompany() {
  const company = await OrganizationModel.create(original);
  return { company, owner: await account('owner', company._id) };
}
const patch = (id, user, body) => {
  const call = request(app).patch(`/api/v1/organizations/${id}`);
  return (user ? call.set('Authorization', `Bearer ${user.testSession.accessToken}`) : call).send(body);
};
const errorOf = (response) => response.body.error.message;
const unchanged = async (company) =>
  expect((await OrganizationModel.findById(company._id)).toObject()).toMatchObject(original);

beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  await seedDefaultRoles();
  await Promise.all([UserModel.init(), MembershipModel.init()]);
  await IndustryModel.create([
    { code: 'org-update-retail', name: 'Bán lẻ' },
    { code: 'org-update-tech', name: 'Công nghệ' },
  ]);
  otherCompany = await OrganizationModel.create({ name: 'Công ty khác', taxCode: '0398765432' });
  app = createApp();
});
afterAll(async () => {
  await mongoose.disconnect();
  if (repl) await repl.stop();
});

test('UTCID01: the Owner updates every field; text is trimmed and the address is rebuilt', async () => {
  const { company, owner } = await ownerWithCompany();
  const response = await patch(company.id, owner, {
    name: '  Công ty Minh Tâm Mới  ',
    taxCode: '0312345678-001',
    industry: 'org-update-tech',
    addressDetails: { provinceCode: '01', wardCode: '00004', addressLine: '  25 Phan Đình Phùng  ' },
  });
  expect(response.status).toBe(200);
  expect(response.body.data).toMatchObject({
    name: 'Công ty Minh Tâm Mới',
    taxCode: '0312345678-001',
    industry: 'org-update-tech',
    address: '25 Phan Đình Phùng, Phường Ba Đình, Thành phố Hà Nội',
  });
});

test('UTCID02: updating only the name keeps the other fields', async () => {
  const { company, owner } = await ownerWithCompany();
  const response = await patch(company.id, owner, { name: 'Tên mới' });
  expect(response.status).toBe(200);
  expect(response.body.data).toMatchObject({ ...original, name: 'Tên mới' });
});

test('UTCID03: a 2-character name is accepted', async () => {
  const { company, owner } = await ownerWithCompany();
  const response = await patch(company.id, owner, { name: 'AB' });
  expect(response.status).toBe(200);
  expect(response.body.data.name).toBe('AB');
});

test('UTCID04: a 1-character name is rejected', async () => {
  const { company, owner } = await ownerWithCompany();
  const response = await patch(company.id, owner, { name: 'A' });
  expect(response.status).toBe(400);
  await unchanged(company);
});

test('UTCID05: an invalid tax code is rejected', async () => {
  const { company, owner } = await ownerWithCompany();
  const response = await patch(company.id, owner, { taxCode: '031234567' });
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Mã số thuế gồm 10 chữ số hoặc 10 chữ số và mã chi nhánh 3 chữ số.');
  await unchanged(company);
});

test('UTCID06: an unknown industry is rejected', async () => {
  const { company, owner } = await ownerWithCompany();
  const response = await patch(company.id, owner, { industry: 'nonexistent-industry' });
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Unknown industry: nonexistent-industry');
  await unchanged(company);
});

test('UTCID07: a ward outside the selected province is rejected', async () => {
  const { company, owner } = await ownerWithCompany();
  const response = await patch(company.id, owner, {
    addressDetails: { provinceCode: '79', wardCode: '00004', addressLine: '12 Test' },
  });
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Xã/phường không thuộc tỉnh/thành phố đã chọn.');
  await unchanged(company);
});

test('UTCID08: an empty update is rejected', async () => {
  const { company, owner } = await ownerWithCompany();
  const response = await patch(company.id, owner, {});
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Vui lòng cập nhật ít nhất một trường.');
});

test('UTCID09: fields outside the allowed list are rejected', async () => {
  const { company, owner } = await ownerWithCompany();
  const response = await patch(company.id, owner, { name: 'Tên mới', isPersonal: true });
  expect(response.status).toBe(400);
  expect(errorOf(response)).toMatch(/Unrecognized key/);
  await unchanged(company);
});

test("UTCID10: the Owner cannot update another organization", async () => {
  const { owner } = await ownerWithCompany();
  const response = await patch(otherCompany.id, owner, { name: 'Chiếm quyền' });
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Forbidden');
  expect((await OrganizationModel.findById(otherCompany._id)).name).toBe('Công ty khác');
});

test('UTCID11: Staff cannot update the organization', async () => {
  const { company } = await ownerWithCompany();
  const staff = await account('staff', company._id);
  const response = await patch(company.id, staff, { name: 'Staff đổi tên' });
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Requires role: owner');
  await unchanged(company);
});
