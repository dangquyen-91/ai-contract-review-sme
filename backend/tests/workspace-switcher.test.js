// Workspace menu: listing the personal and organization workspaces, and Staff leaving an organization.
const {
  start, stop, account, ownerWithCompany, seedInvitation, call, errorOf, statusOf, membershipOf, missingId, UserModel,
} = require('./helpers/invitations');

const workspaces = (user) => call('get', '/auth/workspaces', user);
const leave = (orgId, user) => call('post', `/organizations/${orgId}/leave`, user);
async function team() {
  const { company, owner } = await ownerWithCompany('Công ty Minh Tâm');
  return { company, owner, staff: await account('staff', company._id, { name: 'Lê Thu Hà', hasCompletedOnboarding: true }) };
}

beforeAll(start);
afterAll(stop);

describe('GET /auth/workspaces', () => {
  test('a member sees both workspaces with their names, plans and review units', async () => {
    const { company, staff } = await team();
    const response = await workspaces(staff);
    expect(response.status).toBe(200);
    const [personal, organization] = response.body.data.items;
    expect(personal).toMatchObject({ key: 'personal', id: staff.id, name: 'Lê Thu Hà', role: null });
    expect(personal.analysis).toEqual({ available: expect.any(Number), limit: expect.any(Number) });
    expect(personal.drafting).toEqual({ available: expect.any(Number), limit: expect.any(Number) });
    expect(organization).toMatchObject({ key: 'organization', id: company.id, name: 'Công ty Minh Tâm', role: 'staff' });
    expect(organization).toHaveProperty('status');
    expect(organization).toHaveProperty('plan');
  });

  test('the owner is listed with the owner role', async () => {
    const { owner } = await team();
    const { body } = await workspaces(owner);
    expect(body.data.items.find((item) => item.key === 'organization').role).toBe('owner');
  });

  test('a user without an organization only has the personal workspace', async () => {
    const user = await account('user');
    const { body } = await workspaces(user);
    expect(body.data.items.map((item) => item.key)).toEqual(['personal']);
  });

  test('a signed-out request is rejected', async () => {
    expect((await workspaces()).status).toBe(401);
  });
});

describe('POST /organizations/:id/leave', () => {
  test('Staff leaves: the membership ends and the session must be refreshed', async () => {
    const { company, staff } = await team();
    const before = (await UserModel.findById(staff.id)).permissionsVersion ?? 0;
    const response = await leave(company.id, staff);
    expect(response.status).toBe(204);
    expect(await membershipOf(staff)).toBeNull();
    expect((await UserModel.findById(staff.id)).permissionsVersion).toBe(before + 1);
  });

  test('a pending invitation to the leaving member is revoked', async () => {
    const { company, owner, staff } = await team();
    const { invitation } = await seedInvitation(company, owner, { email: staff.email });
    await leave(company.id, staff);
    expect(await statusOf(invitation)).toBe('revoked');
  });

  test('after leaving, the old access token is rejected until the session is refreshed', async () => {
    const { company, staff } = await team();
    await leave(company.id, staff);
    const response = await workspaces(staff);
    expect(response.status).toBe(401);
    expect(errorOf(response)).toBe('Account permissions changed. Refresh your access token.');
  });

  test('the owner cannot leave', async () => {
    const { company, owner } = await team();
    const response = await leave(company.id, owner);
    expect(response.status).toBe(409);
    expect(errorOf(response)).toBe('Chủ tổ chức không thể rời tổ chức. Hãy xóa tổ chức nếu không còn sử dụng.');
    expect(await membershipOf(owner)).not.toBeNull();
  });

  test('a user cannot leave an organization they do not belong to', async () => {
    const [{ company }, outsider] = [await team(), await account('user')];
    const response = await leave(company.id, outsider);
    expect(response.status).toBe(404);
    expect(errorOf(response)).toBe('Bạn không còn là thành viên tổ chức này.');
  });

  test('an organization that does not exist is not found', async () => {
    const { staff } = await team();
    expect((await leave(missingId(), staff)).status).toBe(404);
    expect(await membershipOf(staff)).not.toBeNull();
  });
});
