// Unit test cases for MEM-09 declineReceivedInvitation (UTCID01–UTCID10 in the test-case sheet).
const {
  DAY, start, stop, account, ownerWithCompany, seedInvitation, call, errorOf, statusOf, membershipOf, missingId, UserModel,
} = require('./helpers/invitations');

const decline = (id, user) => call('post', `/invitations/received/${id}/decline`, user);
const GONE = 'Invitation is no longer available';
async function invited(fields = {}) {
  const { company, owner } = await ownerWithCompany();
  const user = await account();
  return { user, ...(await seedInvitation(company, owner, { email: user.email, ...fields })) };
}

beforeAll(start);
afterAll(stop);

test('UTCID01: the recipient declines; the invitation leaves the list and nobody joins', async () => {
  const { user, invitation } = await invited();
  const response = await decline(invitation.id, user);
  expect(response.status).toBe(200);
  expect(response.body.data).toEqual({ declined: true });
  expect(await statusOf(invitation)).toBe('declined');
  expect((await call('get', '/invitations/received', user)).body.data).toEqual([]);
  expect(await membershipOf(user)).toBeNull();
});

test('UTCID02: an invitation sent to another email cannot be declined', async () => {
  const { invitation } = await invited();
  const response = await decline(invitation.id, await account());
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe(GONE);
  expect(await statusOf(invitation)).toBe('pending');
});

test('UTCID03: an expired invitation cannot be declined', async () => {
  const { user, invitation } = await invited({ expiresAt: new Date(Date.now() - DAY) });
  const response = await decline(invitation.id, user);
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe(GONE);
  expect(await statusOf(invitation)).toBe('pending');
});

test.each([
  ['UTCID04: an already declined invitation', 'declined'],
  ['UTCID05: a revoked invitation', 'revoked'],
  ['UTCID06: an accepted invitation', 'accepted'],
])('%s cannot be declined', async (_name, status) => {
  const { user, invitation } = await invited({ status });
  const response = await decline(invitation.id, user);
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe(GONE);
  expect(await statusOf(invitation)).toBe(status);
});

test('UTCID07: an invitation that does not exist is rejected', async () => {
  const response = await decline(missingId(), await account());
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe(GONE);
});

test('UTCID08: an invalid invitation ID is rejected', async () => {
  const response = await decline('abc', await account());
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Invalid');
});

test('UTCID09: a disabled account is rejected', async () => {
  const { user, invitation } = await invited();
  await UserModel.updateOne({ _id: user._id }, { $set: { isActive: false } });
  const response = await decline(invitation.id, user);
  expect(response.status).toBe(401);
  expect(errorOf(response)).toBe('User is inactive or no longer exists');
  expect(await statusOf(invitation)).toBe('pending');
});

test('UTCID10: a request without a token is rejected', async () => {
  const { invitation } = await invited();
  const response = await decline(invitation.id);
  expect(response.status).toBe(401);
  expect(errorOf(response)).toBe('Missing bearer token');
  expect(await statusOf(invitation)).toBe('pending');
});
