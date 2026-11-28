// Unit test cases for ORG-04 deleteOrganization (UTCID01–UTCID09 in the test-case sheet).
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'organization-delete-access';
process.env.JWT_REFRESH_SECRET = 'organization-delete-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const request = require('supertest');
const { createApp } = require('../dist/app');
const { logger } = require('../dist/config/logger');
logger.silent = true;
const { UserModel } = require('../dist/models/user.model');
const { OrganizationModel } = require('../dist/models/organization.model');
const { MembershipModel } = require('../dist/models/membership.model');
const { ContractModel } = require('../dist/models/contract.model');
const { OrganizationInvitationModel } = require('../dist/models/organizationInvitation.model');
const { seedDefaultRoles } = require('../dist/services/identity/role.service');
const { createAccount } = require('./helpers/accounts');

let repl, app, sequence = 0;
const account = (role, orgId) =>
  createAccount({ role, orgId, name: 'Org remover', email: `org-delete-${++sequence}@example.com` });
async function ownerWithCompany() {
  const company = await OrganizationModel.create({ name: 'Công ty Minh Tâm', taxCode: '0312345678' });
  return { company, owner: await account('owner', company._id) };
}
const remove = (id, token) => {
  const call = request(app).delete(`/api/v1/organizations/${id}`);
  return token ? call.set('Authorization', `Bearer ${token}`) : call;
};
const tokenOf = (user) => user.testSession.accessToken;
const errorOf = (response) => response.body.error.message;
const stillThere = async (company, owner) => {
  expect(await OrganizationModel.exists({ _id: company._id })).not.toBeNull();
  if (owner) expect(await MembershipModel.exists({ userId: owner._id, orgId: company._id, role: 'owner' })).not.toBeNull();
};
const invitation = (company, owner, status) =>
  OrganizationInvitationModel.create({
    orgId: company._id,
    invitedBy: owner._id,
    email: `invitee-${++sequence}@example.com`,
    role: 'staff',
    tokenHash: `org-delete-token-${sequence}`,
    expiresAt: new Date(Date.now() + 3600_000),
    status,
  });

beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  await seedDefaultRoles();
  await Promise.all([UserModel.init(), MembershipModel.init(), OrganizationInvitationModel.init()]);
  app = createApp();
});
afterAll(async () => {
  await mongoose.disconnect();
  if (repl) await repl.stop();
});

test('UTCID01: the only Owner deletes an empty organization and returns to the personal workspace', async () => {
  const { company, owner } = await ownerWithCompany();
  const pending = await invitation(company, owner, 'pending');
  const accepted = await invitation(company, owner, 'accepted');
  const before = (await UserModel.findById(owner.id)).permissionsVersion ?? 0;
  const response = await remove(company.id, tokenOf(owner));
  expect(response.status).toBe(204);
  expect(await OrganizationModel.exists({ _id: company._id })).toBeNull();
  expect(await MembershipModel.exists({ userId: owner._id })).toBeNull();
  const user = await UserModel.findById(owner.id);
  expect(user.hasCompletedOnboarding).toBe(true);
  expect(user.permissionsVersion).toBe(before + 1);
  expect((await OrganizationInvitationModel.findById(pending._id)).status).toBe('revoked');
  expect((await OrganizationInvitationModel.findById(accepted._id)).status).toBe('accepted');
});

test('UTCID02: the old access token stops working after the organization is deleted', async () => {
  const { company, owner } = await ownerWithCompany();
  expect((await remove(company.id, tokenOf(owner))).status).toBe(204);
  const again = await request(app).get('/api/v1/profile').set('Authorization', `Bearer ${tokenOf(owner)}`);
  expect(again.status).toBe(401);
  expect(errorOf(again)).toBe('Account permissions changed. Refresh your access token.');
});

test('UTCID03: an organization that still has contracts cannot be deleted', async () => {
  const { company, owner } = await ownerWithCompany();
  await ContractModel.create({ ownerType: 'organization', orgId: company._id, uploadedBy: owner._id, title: 'Hợp đồng thuê' });
  const response = await remove(company.id, tokenOf(owner));
  expect(response.status).toBe(409);
  expect(errorOf(response)).toBe('Organization still has contracts');
  await stillThere(company, owner);
});

test('UTCID04: an organization that still has other members cannot be deleted', async () => {
  const { company, owner } = await ownerWithCompany();
  await account('staff', company._id);
  const response = await remove(company.id, tokenOf(owner));
  expect(response.status).toBe(409);
  expect(errorOf(response)).toBe('Organization still has other members');
  await stillThere(company, owner);
});

test('UTCID05: the Owner cannot delete another organization', async () => {
  const { owner } = await ownerWithCompany();
  const other = await OrganizationModel.create({ name: 'Công ty khác' });
  const response = await remove(other.id, tokenOf(owner));
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Forbidden');
  await stillThere(other);
});

test('UTCID06: Staff cannot delete the organization', async () => {
  const { company, owner } = await ownerWithCompany();
  const staff = await account('staff', company._id);
  const response = await remove(company.id, tokenOf(staff));
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Requires role: owner');
  await stillThere(company, owner);
});

test('UTCID07: an invalid organization ID is rejected', async () => {
  const { owner } = await ownerWithCompany();
  const response = await remove('abc', tokenOf(owner));
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Invalid organization id');
});

test('UTCID08: a request without a token is rejected', async () => {
  const { company } = await ownerWithCompany();
  const response = await remove(company.id);
  expect(response.status).toBe(401);
  expect(errorOf(response)).toBe('Missing bearer token');
  await stillThere(company);
});

test('UTCID09: an organization record that no longer exists returns not found', async () => {
  const { company, owner } = await ownerWithCompany();
  await OrganizationModel.deleteOne({ _id: company._id });
  const response = await remove(company.id, tokenOf(owner));
  expect(response.status).toBe(404);
  expect(errorOf(response)).toBe('Organization not found');
  expect(await MembershipModel.exists({ userId: owner._id })).not.toBeNull();
});
