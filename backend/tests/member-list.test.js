// Unit test cases for MEM-04 listMembers (UTCID01–UTCID10 in the test-case sheet).
const { start, stop, account, ownerWithCompany, call, errorOf, UserModel } = require('./helpers/invitations');

const list = (id, user, query = '') => call('get', `/organizations/${id}/members${query}`, user);
const ids = (response) => response.body.data.map((item) => item.id);
let company, owner, active, disabled, other;

beforeAll(async () => {
  await start();
  ({ company, owner } = await ownerWithCompany());
  active = await account('staff', company._id, { name: 'Lê Thu Hà' });
  disabled = await account('staff', company._id, { name: 'Phạm Quốc Bảo' });
  await UserModel.updateOne({ _id: disabled._id }, { $set: { isActive: false } });
  other = await ownerWithCompany('Công ty khác');
});
afterAll(stop);

test('UTCID01: the Owner sees the members of the organization only, in joining order', async () => {
  const response = await list(company.id, owner);
  expect(response.status).toBe(200);
  expect(ids(response)).toEqual([owner.id, active.id, disabled.id]);
  expect(response.body.data[0]).toEqual({ id: owner.id, name: 'Trần Minh Tâm', email: owner.email, role: 'owner', isActive: true });
  expect(response.body.data[1]).toEqual({ id: active.id, name: 'Lê Thu Hà', email: active.email, role: 'staff', isActive: true });
  expect(response.body.meta).toMatchObject({ page: 1, limit: 20, total: 3 });
});

test('UTCID02: a disabled member is listed as inactive', async () => {
  const response = await list(company.id, owner);
  expect(response.body.data.find((item) => item.id === disabled.id)).toMatchObject({ role: 'staff', isActive: false });
});

test('UTCID03: the second page holds the remaining member', async () => {
  const response = await list(company.id, owner, '?page=2&limit=2');
  expect(response.status).toBe(200);
  expect(ids(response)).toEqual([disabled.id]);
  expect(response.body.meta).toMatchObject({ page: 2, limit: 2, total: 3, totalPages: 2 });
});

test('UTCID04: an organization with only its Owner returns one member', async () => {
  const response = await list(other.company.id, other.owner);
  expect(response.status).toBe(200);
  expect(ids(response)).toEqual([other.owner.id]);
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

test('UTCID07: the Owner cannot list members of another organization', async () => {
  const response = await list(other.company.id, owner);
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Only the organization owner can manage invitations and members');
  expect(response.body.data).toBeUndefined();
});

test('UTCID08: Staff cannot list members', async () => {
  const response = await list(company.id, active);
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
