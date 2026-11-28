// Unit test cases for MEM-03 revokeInvitation (UTCID01–UTCID10 in the test-case sheet).
const {
  DAY, start, stop, account, ownerWithCompany, seedInvitation, call, errorOf, statusOf, membershipOf, missingId,
} = require('./helpers/invitations');

const revoke = (orgId, invitationId, user) => call('delete', `/organizations/${orgId}/invitations/${invitationId}`, user);

beforeAll(start);
afterAll(stop);

test('UTCID01: a revoked invitation can no longer be accepted', async () => {
  const { company, owner } = await ownerWithCompany();
  const invitee = await account();
  const { token, invitation } = await seedInvitation(company, owner, { email: invitee.email });
  const response = await revoke(company.id, invitation.id, owner);
  expect(response.status).toBe(200);
  expect(response.body.data).toMatchObject({ email: invitee.email, status: 'revoked' });
  expect(response.body.data).not.toHaveProperty('tokenHash');
  const accepted = await call('post', '/invitations/accept', invitee, { token });
  expect(accepted.status).toBe(400);
  expect(errorOf(accepted)).toBe('Invitation is invalid, expired, revoked or already used');
  expect(await membershipOf(invitee)).toBeNull();
});

test('UTCID02: a pending invitation past its expiry date can still be revoked', async () => {
  const { company, owner } = await ownerWithCompany();
  const { invitation } = await seedInvitation(company, owner, { expiresAt: new Date(Date.now() - DAY) });
  expect((await revoke(company.id, invitation.id, owner)).status).toBe(200);
  expect(await statusOf(invitation)).toBe('revoked');
});

test.each([
  ['UTCID03: an accepted invitation', 'accepted'],
  ['UTCID04: an already revoked invitation', 'revoked'],
])('%s cannot be revoked', async (_name, status) => {
  const { company, owner } = await ownerWithCompany();
  const { invitation } = await seedInvitation(company, owner, { status });
  const response = await revoke(company.id, invitation.id, owner);
  expect(response.status).toBe(409);
  expect(errorOf(response)).toBe('Pending invitation not found');
  expect(await statusOf(invitation)).toBe(status);
});

test('UTCID05: an invitation of another organization cannot be revoked through the own organization', async () => {
  const { company, owner } = await ownerWithCompany();
  const other = await ownerWithCompany('Công ty khác');
  const { invitation } = await seedInvitation(other.company, other.owner);
  const response = await revoke(company.id, invitation.id, owner);
  expect(response.status).toBe(409);
  expect(errorOf(response)).toBe('Pending invitation not found');
  expect(await statusOf(invitation)).toBe('pending');
});

test('UTCID06: an invitation that does not exist is rejected', async () => {
  const { company, owner } = await ownerWithCompany();
  const response = await revoke(company.id, missingId(), owner);
  expect(response.status).toBe(409);
  expect(errorOf(response)).toBe('Pending invitation not found');
});

test('UTCID07: the Owner cannot act on another organization', async () => {
  const { owner } = await ownerWithCompany();
  const other = await ownerWithCompany('Công ty khác');
  const { invitation } = await seedInvitation(other.company, other.owner);
  const response = await revoke(other.company.id, invitation.id, owner);
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Only the organization owner can manage invitations and members');
  expect(await statusOf(invitation)).toBe('pending');
});

test('UTCID08: an invalid invitation ID is rejected', async () => {
  const { company, owner } = await ownerWithCompany();
  const response = await revoke(company.id, 'abc', owner);
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Invalid invitation id');
});

test('UTCID09: Staff cannot revoke', async () => {
  const { company, owner } = await ownerWithCompany();
  const staff = await account('staff', company._id);
  const { invitation } = await seedInvitation(company, owner);
  const response = await revoke(company.id, invitation.id, staff);
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Requires role: owner');
  expect(await statusOf(invitation)).toBe('pending');
});

test('UTCID10: a request without a token is rejected', async () => {
  const { company, owner } = await ownerWithCompany();
  const { invitation } = await seedInvitation(company, owner);
  const response = await revoke(company.id, invitation.id);
  expect(response.status).toBe(401);
  expect(errorOf(response)).toBe('Missing bearer token');
  expect(await statusOf(invitation)).toBe('pending');
});
