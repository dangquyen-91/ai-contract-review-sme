// Unit test cases for MEM-05 removeMember (UTCID01–UTCID10 in the test-case sheet).
const {
  start, stop, account, ownerWithCompany, seedInvitation, call, errorOf, statusOf, membershipOf, missingId, UserModel,
} = require('./helpers/invitations');
const { ContractModel } = require('../dist/models/contract.model');

const remove = (orgId, userId, user) => call('delete', `/organizations/${orgId}/members/${userId}`, user);
async function team() {
  const { company, owner } = await ownerWithCompany();
  return { company, owner, staff: await account('staff', company._id, { hasCompletedOnboarding: true }) };
}

beforeAll(start);
afterAll(stop);

test('UTCID01: removing Staff ends the membership but keeps the account and the organization contracts', async () => {
  const { company, owner, staff } = await team();
  const contract = await ContractModel.create({ ownerType: 'organization', orgId: company._id, uploadedBy: staff._id, title: 'Hợp đồng thuê' });
  const before = (await UserModel.findById(staff.id)).permissionsVersion ?? 0;
  const response = await remove(company.id, staff.id, owner);
  expect(response.status).toBe(204);
  expect(await membershipOf(staff)).toBeNull();
  const kept = await UserModel.findById(staff.id);
  expect(kept).toMatchObject({ isActive: true, hasCompletedOnboarding: true, permissionsVersion: before + 1 });
  expect(String((await ContractModel.findById(contract._id)).orgId)).toBe(company.id);
});

test('UTCID02: a pending invitation sent to the removed member is revoked', async () => {
  const { company, owner, staff } = await team();
  const mine = await seedInvitation(company, owner, { email: staff.email });
  const someoneElse = await seedInvitation(company, owner);
  expect((await remove(company.id, staff.id, owner)).status).toBe(204);
  expect(await statusOf(mine.invitation)).toBe('revoked');
  expect(await statusOf(someoneElse.invitation)).toBe('pending');
});

test('UTCID03: the old access token of the removed member stops working', async () => {
  const { company, owner, staff } = await team();
  expect((await remove(company.id, staff.id, owner)).status).toBe(204);
  const response = await call('get', '/profile', staff);
  expect(response.status).toBe(401);
  expect(errorOf(response)).toBe('Account permissions changed. Refresh your access token.');
});

test('UTCID04: the Owner cannot be removed', async () => {
  const { company, owner } = await team();
  const response = await remove(company.id, owner.id, owner);
  expect(response.status).toBe(409);
  expect(errorOf(response)).toBe('The organization owner cannot be removed');
  expect(await membershipOf(owner)).not.toBeNull();
});

test('UTCID05: a member of another organization cannot be removed through the own organization', async () => {
  const { company, owner } = await team();
  const other = await team();
  const response = await remove(company.id, other.staff.id, owner);
  expect(response.status).toBe(404);
  expect(errorOf(response)).toBe('Organization member not found');
  expect(await membershipOf(other.staff)).not.toBeNull();
});

test('UTCID06: a user that does not exist is rejected', async () => {
  const { company, owner } = await team();
  const response = await remove(company.id, missingId(), owner);
  expect(response.status).toBe(404);
  expect(errorOf(response)).toBe('Organization member not found');
});

test('UTCID07: the Owner cannot act on another organization', async () => {
  const { owner } = await team();
  const other = await team();
  const response = await remove(other.company.id, other.staff.id, owner);
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Only the organization owner can manage invitations and members');
  expect(await membershipOf(other.staff)).not.toBeNull();
});

test('UTCID08: an invalid user ID is rejected', async () => {
  const { company, owner } = await team();
  const response = await remove(company.id, 'abc', owner);
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Invalid user id');
});

test('UTCID09: Staff cannot remove a member', async () => {
  const { company, staff } = await team();
  const colleague = await account('staff', company._id);
  const response = await remove(company.id, colleague.id, staff);
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Requires role: owner');
  expect(await membershipOf(colleague)).not.toBeNull();
});

test('UTCID10: a request without a token is rejected', async () => {
  const { company, staff } = await team();
  const response = await remove(company.id, staff.id);
  expect(response.status).toBe(401);
  expect(errorOf(response)).toBe('Missing bearer token');
  expect(await membershipOf(staff)).not.toBeNull();
});
