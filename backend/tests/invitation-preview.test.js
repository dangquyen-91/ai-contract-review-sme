// Unit test cases for MEM-06 previewInvitation (UTCID01–UTCID09 in the test-case sheet).
const { DAY, start, stop, ownerWithCompany, seedInvitation, call, errorOf, OrganizationModel, OrganizationInvitationModel } = require('./helpers/invitations');

const preview = (body) => call('post', '/invitations/preview', null, body);
const UNUSABLE = 'Invitation is invalid, expired, revoked or already used';
let company, owner;

beforeAll(async () => {
  await start();
  ({ company, owner } = await ownerWithCompany());
});
afterAll(stop);

test('UTCID01: a valid token shows only the safe details, without signing in', async () => {
  const { token, invitation } = await seedInvitation(company, owner);
  const response = await preview({ token });
  expect(response.status).toBe(200);
  expect(response.headers['cache-control']).toBe('no-store');
  expect(response.body.data).toEqual({
    organizationName: 'Công ty Minh Tâm',
    email: invitation.email,
    role: 'staff',
    expiresAt: invitation.expiresAt.toISOString(),
  });
});

test('UTCID02: an unknown token is rejected', async () => {
  const response = await preview({ token: 'a'.repeat(64) });
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe(UNUSABLE);
});

test.each([
  ['UTCID03: an expired invitation', { expiresAt: new Date(Date.now() - DAY) }],
  ['UTCID04: a revoked invitation', { status: 'revoked' }],
  ['UTCID05: an accepted invitation', { status: 'accepted' }],
])('%s is rejected', async (_name, fields) => {
  const { token } = await seedInvitation(company, owner, fields);
  const response = await preview({ token });
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe(UNUSABLE);
});

test('UTCID06: an invitation of a deleted organization is rejected', async () => {
  const gone = await ownerWithCompany('Công ty đã xóa');
  const { token } = await seedInvitation(gone.company, gone.owner);
  await OrganizationModel.deleteOne({ _id: gone.company._id });
  const response = await preview({ token });
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('The invited organization no longer exists');
});

test('UTCID07: an old invitation with a role other than Staff is rejected', async () => {
  const { token, invitation } = await seedInvitation(company, owner);
  // The schema no longer allows this role, so write it straight to the collection.
  await OrganizationInvitationModel.collection.updateOne({ _id: invitation._id }, { $set: { role: 'manager' } });
  const response = await preview({ token });
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Tổ chức chỉ được mời Staff.');
});

test('UTCID08: a 63-character token is rejected', async () => {
  const response = await preview({ token: 'a'.repeat(63) });
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Invalid invitation token');
});

test('UTCID09: a missing token is rejected', async () => {
  const response = await preview({});
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Required');
});
