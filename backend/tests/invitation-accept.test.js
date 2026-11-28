// Unit test cases for MEM-07 acceptInvitation (UTCID01–UTCID15 in the test-case sheet).
const {
  DAY, start, stop, account, ownerWithCompany, seedInvitation, call, errorOf, statusOf, membershipOf,
  UserModel, OrganizationModel, OrganizationInvitationModel,
} = require('./helpers/invitations');
const { sessionOf } = require('./helpers/accounts');

const byToken = (token, user) => call('post', '/invitations/accept', user, { token });
const byId = (invitation, user) => call('post', `/invitations/received/${invitation.id}/accept`, user);
const UNUSABLE = 'Invitation is invalid, expired, revoked or already used';
async function invited(fields = {}, role = 'user', orgId) {
  const { company, owner } = await ownerWithCompany();
  const user = await account(role, orgId, { hasCompletedOnboarding: false });
  return { company, owner, user, ...(await seedInvitation(company, owner, { email: user.email, ...fields })) };
}

beforeAll(start);
afterAll(stop);

test('UTCID01: accepting by email link joins the organization as Staff', async () => {
  const { company, owner, user, token, invitation } = await invited();
  const response = await byToken(token, user);
  expect(response.status).toBe(200);
  expect(response.headers['cache-control']).toBe('no-store');
  expect(response.body.data.user).toMatchObject({ id: user.id, role: 'staff', orgId: company.id, hasCompletedOnboarding: true });
  expect(await membershipOf(user)).toMatchObject({ orgId: company._id, role: 'staff', invitedBy: owner._id });
  const stored = await OrganizationInvitationModel.findById(invitation._id);
  expect(stored.status).toBe('accepted');
  expect(String(stored.acceptedBy)).toBe(user.id);
  expect(stored.acceptedAt).toBeInstanceOf(Date);
});

test('UTCID02: accepting by invitation ID in the app joins the organization', async () => {
  const { company, user, invitation } = await invited();
  const response = await byId(invitation, user);
  expect(response.status).toBe(200);
  expect(response.body.data.user).toMatchObject({ role: 'staff', orgId: company.id });
  expect(await statusOf(invitation)).toBe('accepted');
});

test('UTCID03: the last free seat can be taken', async () => {
  const { company, user, token } = await invited();
  await account('staff', company._id);
  expect((await byToken(token, user)).status).toBe(200);
});

test('UTCID04: a full organization is rejected and the invitation stays pending', async () => {
  const { company, user, token, invitation } = await invited();
  await account('staff', company._id);
  await account('staff', company._id);
  const response = await byToken(token, user);
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Đã đạt giới hạn thành viên. Vui lòng nâng cấp gói hoặc xóa bớt thành viên.');
  expect(await membershipOf(user)).toBeNull();
  expect(await statusOf(invitation)).toBe('pending');
});

test('UTCID05: an account with another email is rejected', async () => {
  const { token, invitation } = await invited();
  const stranger = await account();
  const response = await byToken(token, stranger);
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Sign in with the email address that received the invitation');
  expect(await membershipOf(stranger)).toBeNull();
  expect(await statusOf(invitation)).toBe('pending');
});

test('UTCID06: the invitation ID of another email is rejected', async () => {
  const { invitation } = await invited();
  const stranger = await account();
  const response = await byId(invitation, stranger);
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Invitation is no longer available');
  expect(await membershipOf(stranger)).toBeNull();
  expect(await statusOf(invitation)).toBe('pending');
});

test.each([
  ['UTCID07: an expired invitation', { expiresAt: new Date(Date.now() - DAY) }],
  ['UTCID08: a revoked invitation', { status: 'revoked' }],
])('%s is rejected', async (_name, fields) => {
  const { user, token } = await invited(fields);
  const response = await byToken(token, user);
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe(UNUSABLE);
  expect(await membershipOf(user)).toBeNull();
});

test('UTCID09: an invitation cannot be used twice', async () => {
  const { user, token } = await invited();
  expect((await byToken(token, user)).status).toBe(200);
  user.testSession = await sessionOf(user);
  const response = await byToken(token, user);
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe(UNUSABLE);
});

test('UTCID10: a current member of the same organization is rejected', async () => {
  const { company, owner } = await ownerWithCompany();
  const staff = await account('staff', company._id);
  const { token, invitation } = await seedInvitation(company, owner, { email: staff.email });
  const response = await byToken(token, staff);
  expect(response.status).toBe(409);
  expect(errorOf(response)).toBe('This user is already a member');
  expect(await statusOf(invitation)).toBe('pending');
});

test('UTCID11: a member of another organization is rejected', async () => {
  const other = await ownerWithCompany('Công ty khác');
  const { user, token, invitation } = await invited({}, 'staff', other.company._id);
  const response = await byToken(token, user);
  expect(response.status).toBe(409);
  expect(errorOf(response)).toBe('This user already belongs to another organization');
  expect((await membershipOf(user)).orgId).toEqual(other.company._id);
  expect(await statusOf(invitation)).toBe('pending');
});

test('UTCID12: a system account is rejected', async () => {
  const { user, token, invitation } = await invited({}, 'manager');
  const response = await byToken(token, user);
  expect(response.status).toBe(409);
  expect(errorOf(response)).toBe('Only personal accounts can join an organization');
  expect(await statusOf(invitation)).toBe('pending');
});

test('UTCID13: an invitation of a deleted organization is rejected', async () => {
  const { company, user, invitation } = await invited();
  await OrganizationModel.deleteOne({ _id: company._id });
  const response = await byId(invitation, user);
  expect(response.status).toBe(409);
  expect(errorOf(response)).toBe('Organization no longer exists');
  expect(await membershipOf(user)).toBeNull();
});

test('UTCID14: a token with the wrong format is rejected', async () => {
  const { user } = await invited();
  const response = await byToken('a'.repeat(63), user);
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Invalid invitation token');
});

test('UTCID15: a request without an access token is rejected', async () => {
  const { user, token, invitation } = await invited();
  const response = await byToken(token);
  expect(response.status).toBe(401);
  expect(errorOf(response)).toBe('Missing bearer token');
  expect((await UserModel.findById(user.id)).hasCompletedOnboarding).toBe(false);
  expect(await statusOf(invitation)).toBe('pending');
});
