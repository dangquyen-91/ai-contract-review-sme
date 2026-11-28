// Unit test cases for MEM-08 listReceivedInvitations (UTCID01–UTCID07 in the test-case sheet).
const { DAY, start, stop, account, ownerWithCompany, seedInvitation, call, errorOf, UserModel, OrganizationModel } = require('./helpers/invitations');

const received = (user) => call('get', '/invitations/received', user);

beforeAll(start);
afterAll(stop);

test('UTCID01: pending invitations from several organizations are listed newest first with safe fields only', async () => {
  const user = await account();
  const first = await ownerWithCompany();
  const second = await ownerWithCompany('Công ty An Phát');
  const older = await seedInvitation(first.company, first.owner, { email: user.email, createdAt: new Date('2026-01-01') });
  const newer = await seedInvitation(second.company, second.owner, { email: user.email, createdAt: new Date('2026-02-01') });
  const response = await received(user);
  expect(response.status).toBe(200);
  expect(response.headers['cache-control']).toBe('no-store');
  expect(response.body.data).toEqual([
    { id: newer.invitation.id, organizationName: 'Công ty An Phát', role: 'staff', expiresAt: newer.invitation.expiresAt.toISOString() },
    { id: older.invitation.id, organizationName: 'Công ty Minh Tâm', role: 'staff', expiresAt: older.invitation.expiresAt.toISOString() },
  ]);
});

test('UTCID02: an account without invitations gets an empty list', async () => {
  const response = await received(await account());
  expect(response.status).toBe(200);
  expect(response.body.data).toEqual([]);
});

test('UTCID03: expired, revoked, accepted and declined invitations are left out', async () => {
  const user = await account();
  const { company, owner } = await ownerWithCompany();
  for (const status of ['revoked', 'accepted', 'declined'])
    await seedInvitation(company, owner, { email: user.email, status });
  await seedInvitation(company, owner, { email: user.email, expiresAt: new Date(Date.now() - DAY) });
  const response = await received(user);
  expect(response.status).toBe(200);
  expect(response.body.data).toEqual([]);
});

test('UTCID04: invitations sent to another email are left out', async () => {
  const user = await account();
  const { company, owner } = await ownerWithCompany();
  await seedInvitation(company, owner);
  const response = await received(user);
  expect(response.status).toBe(200);
  expect(response.body.data).toEqual([]);
});

test('UTCID05: an invitation of a deleted organization is left out', async () => {
  const user = await account();
  const { company, owner } = await ownerWithCompany();
  await seedInvitation(company, owner, { email: user.email });
  await OrganizationModel.deleteOne({ _id: company._id });
  const response = await received(user);
  expect(response.status).toBe(200);
  expect(response.body.data).toEqual([]);
});

test('UTCID06: a disabled account is rejected', async () => {
  const user = await account();
  await UserModel.updateOne({ _id: user._id }, { $set: { isActive: false } });
  const response = await received(user);
  expect(response.status).toBe(401);
  expect(errorOf(response)).toBe('User is inactive or no longer exists');
});

test('UTCID07: a request without a token is rejected', async () => {
  const response = await received();
  expect(response.status).toBe(401);
  expect(errorOf(response)).toBe('Missing bearer token');
});
