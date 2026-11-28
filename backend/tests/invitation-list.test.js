// Unit test cases for MEM-02 listInvitations (UTCID01–UTCID10 in the test-case sheet).
const { DAY, start, stop, account, ownerWithCompany, seedInvitation, call, errorOf } = require('./helpers/invitations');

const list = (id, user, query = '') => call('get', `/organizations/${id}/invitations${query}`, user);
const emails = (response) => response.body.data.map((item) => item.email);
let company, owner, staff, other;

beforeAll(async () => {
  await start();
  ({ company, owner } = await ownerWithCompany());
  staff = await account('staff', company._id);
  other = await ownerWithCompany('Công ty khác');
  const at = (day) => new Date(Date.UTC(2026, 0, day));
  // Oldest to newest; the list must come back in the opposite order.
  await seedInvitation(company, owner, { email: 'accepted@example.com', status: 'accepted', createdAt: at(1) });
  await seedInvitation(company, owner, { email: 'revoked@example.com', status: 'revoked', createdAt: at(2) });
  await seedInvitation(company, owner, { email: 'overdue@example.com', expiresAt: new Date(Date.now() - DAY), createdAt: at(3) });
  await seedInvitation(company, owner, { email: 'pending@example.com', createdAt: at(4) });
  await seedInvitation(other.company, other.owner, { email: 'elsewhere@example.com' });
});
afterAll(stop);

test('UTCID01: the Owner sees every invitation of the organization, newest first, without token hashes', async () => {
  const response = await list(company.id, owner);
  expect(response.status).toBe(200);
  expect(response.body.data.map(({ email, status }) => [email, status])).toEqual([
    ['pending@example.com', 'pending'],
    ['overdue@example.com', 'expired'],
    ['revoked@example.com', 'revoked'],
    ['accepted@example.com', 'accepted'],
  ]);
  for (const item of response.body.data) expect(item).not.toHaveProperty('tokenHash');
  expect(response.body.meta).toMatchObject({ page: 1, limit: 20, total: 4 });
});

test('UTCID02: the second page holds the remaining invitation', async () => {
  const response = await list(company.id, owner, '?page=2&limit=3');
  expect(response.status).toBe(200);
  expect(emails(response)).toEqual(['accepted@example.com']);
  expect(response.body.meta).toMatchObject({ page: 2, limit: 3, total: 4, totalPages: 2 });
});

test('UTCID03: an organization without invitations returns an empty list', async () => {
  const empty = await ownerWithCompany('Công ty mới');
  const response = await list(empty.company.id, empty.owner);
  expect(response.status).toBe(200);
  expect(response.body.data).toEqual([]);
  expect(response.body.meta.total).toBe(0);
});

test('UTCID04: limit 100 is accepted', async () => {
  const response = await list(company.id, owner, '?limit=100');
  expect(response.status).toBe(200);
  expect(response.body.data).toHaveLength(4);
});

test('UTCID05: limit 101 is rejected', async () => {
  const response = await list(company.id, owner, '?limit=101');
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Number must be less than or equal to 100');
});

test('UTCID06: page 0 is rejected', async () => {
  const response = await list(company.id, owner, '?page=0');
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Number must be greater than or equal to 1');
});

test('UTCID07: the Owner cannot list invitations of another organization', async () => {
  const response = await list(other.company.id, owner);
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Only the organization owner can manage invitations and members');
  expect(response.body.data).toBeUndefined();
});

test('UTCID08: Staff cannot list invitations', async () => {
  const response = await list(company.id, staff);
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Requires role: owner');
});

test('UTCID09: an invalid organization ID is rejected', async () => {
  const response = await list('abc', owner);
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Invalid organization id');
});

test('UTCID10: a request without a token is rejected', async () => {
  const response = await list(company.id);
  expect(response.status).toBe(401);
  expect(errorOf(response)).toBe('Missing bearer token');
});
