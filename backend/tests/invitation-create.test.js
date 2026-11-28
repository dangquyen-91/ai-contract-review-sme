// Unit test cases for MEM-01 createInvitation (UTCID01–UTCID15 in the test-case sheet).
jest.mock('../dist/services/organization/invitationEmail.service', () => ({
  ensureInvitationEmailConfigured: jest.fn(),
  sendInvitationEmail: jest.fn(),
}));
const {
  DAY, start, stop, newEmail, account, ownerWithCompany, seedInvitation, call,
  errorOf, statusOf, membershipOf, OrganizationInvitationModel,
} = require('./helpers/invitations');
const { AppError } = require('../dist/errors/AppError');
const { sendInvitationEmail } = require('../dist/services/organization/invitationEmail.service');

const invite = (company, user, body) => call('post', `/organizations/${company.id}/invitations`, user, body);
const countIn = (company) => OrganizationInvitationModel.countDocuments({ orgId: company._id });
const LIMIT = 'Đã đạt giới hạn thành viên. Vui lòng nâng cấp gói hoặc xóa bớt thành viên.';
async function expectNothingSent(company, count = 0) {
  expect(await countIn(company)).toBe(count);
  expect(sendInvitationEmail).not.toHaveBeenCalled();
}

beforeAll(start);
afterAll(stop);

test('UTCID01: the Owner invites a Staff member; the email is normalized and the token stays secret', async () => {
  const { company, owner } = await ownerWithCompany();
  const response = await invite(company, owner, { email: '  New.Staff@Example.com  ', role: 'staff' });
  expect(response.status).toBe(201);
  expect(response.body.data).toMatchObject({ orgId: company.id, email: 'new.staff@example.com', role: 'staff', status: 'pending' });
  expect(response.body.data).not.toHaveProperty('token');
  expect(response.body.data).not.toHaveProperty('tokenHash');
  const lifetime = new Date(response.body.data.expiresAt) - Date.now();
  expect(lifetime).toBeGreaterThan(7 * DAY - 60_000);
  expect(lifetime).toBeLessThanOrEqual(7 * DAY);
  expect(sendInvitationEmail).toHaveBeenCalledTimes(1);
  expect(sendInvitationEmail.mock.calls[0][0]).toMatchObject({ email: 'new.staff@example.com', organizationName: 'Công ty Minh Tâm' });
});

test('UTCID02: an expired invitation can be replaced by a new one', async () => {
  const { company, owner } = await ownerWithCompany();
  const email = newEmail();
  const { invitation } = await seedInvitation(company, owner, { email, expiresAt: new Date(Date.now() - DAY) });
  const response = await invite(company, owner, { email, role: 'staff' });
  expect(response.status).toBe(201);
  expect(await statusOf(invitation)).toBe('expired');
});

test('UTCID03: an existing personal account can be invited and does not join before accepting', async () => {
  const { company, owner } = await ownerWithCompany();
  const person = await account();
  const response = await invite(company, owner, { email: person.email, role: 'staff' });
  expect(response.status).toBe(201);
  expect(await membershipOf(person)).toBeNull();
});

test('UTCID04: the last free seat can be invited', async () => {
  const { company, owner } = await ownerWithCompany();
  await account('staff', company._id);
  expect((await invite(company, owner, { email: newEmail(), role: 'staff' })).status).toBe(201);
});

test('UTCID05: a full organization is rejected; a pending invitation already reserves a seat', async () => {
  const { company, owner } = await ownerWithCompany();
  await account('staff', company._id);
  await seedInvitation(company, owner);
  const response = await invite(company, owner, { email: newEmail(), role: 'staff' });
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe(LIMIT);
  await expectNothingSent(company, 1);
});

test('UTCID06: an invalid email is rejected', async () => {
  const { company, owner } = await ownerWithCompany();
  const response = await invite(company, owner, { email: 'not-an-email', role: 'staff' });
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Invalid email');
  await expectNothingSent(company);
});

test('UTCID07: a role other than Staff is rejected', async () => {
  const { company, owner } = await ownerWithCompany();
  const response = await invite(company, owner, { email: newEmail(), role: 'owner' });
  expect(response.status).toBe(400);
  expect(errorOf(response)).toBe('Invalid literal value, expected "staff"');
  await expectNothingSent(company);
});

test('UTCID08: an email with a pending invitation is rejected', async () => {
  const { company, owner } = await ownerWithCompany();
  const { invitation } = await seedInvitation(company, owner);
  const response = await invite(company, owner, { email: invitation.email, role: 'staff' });
  expect(response.status).toBe(409);
  expect(errorOf(response)).toBe('A pending invitation already exists. Revoke it before sending another.');
  await expectNothingSent(company, 1);
});

test('UTCID09: a current member is rejected', async () => {
  const { company, owner } = await ownerWithCompany();
  const staff = await account('staff', company._id);
  const response = await invite(company, owner, { email: staff.email, role: 'staff' });
  expect(response.status).toBe(409);
  expect(errorOf(response)).toBe('This user is already a member');
  await expectNothingSent(company);
});

test('UTCID10: a member of another organization is rejected', async () => {
  const { company, owner } = await ownerWithCompany();
  const other = await ownerWithCompany('Công ty khác');
  const response = await invite(company, owner, { email: other.owner.email, role: 'staff' });
  expect(response.status).toBe(409);
  expect(errorOf(response)).toBe('This user already belongs to another organization');
  await expectNothingSent(company);
});

test('UTCID11: a system account is rejected', async () => {
  const { company, owner } = await ownerWithCompany();
  const manager = await account('manager');
  const response = await invite(company, owner, { email: manager.email, role: 'staff' });
  expect(response.status).toBe(409);
  expect(errorOf(response)).toBe('Only personal accounts can join an organization');
  await expectNothingSent(company);
});

test('UTCID12: a failed email marks the invitation as not delivered', async () => {
  const { company, owner } = await ownerWithCompany();
  sendInvitationEmail.mockRejectedValueOnce(new AppError('Could not send invitation email. Please try again.', 502));
  const response = await invite(company, owner, { email: newEmail(), role: 'staff' });
  expect(response.status).toBe(502);
  expect(errorOf(response)).toBe('Could not send invitation email. Please try again.');
  expect((await OrganizationInvitationModel.findOne({ orgId: company._id })).status).toBe('delivery_failed');
});

test('UTCID13: the Owner cannot invite into another organization', async () => {
  const { owner } = await ownerWithCompany();
  const other = await ownerWithCompany('Công ty khác');
  const response = await invite(other.company, owner, { email: newEmail(), role: 'staff' });
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Only the organization owner can manage invitations and members');
  await expectNothingSent(other.company);
});

test('UTCID14: Staff cannot invite', async () => {
  const { company } = await ownerWithCompany();
  const staff = await account('staff', company._id);
  const response = await invite(company, staff, { email: newEmail(), role: 'staff' });
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Requires role: owner');
  await expectNothingSent(company);
});

test('UTCID15: a request without a token is rejected', async () => {
  const { company } = await ownerWithCompany();
  const response = await invite(company, null, { email: newEmail(), role: 'staff' });
  expect(response.status).toBe(401);
  expect(errorOf(response)).toBe('Missing bearer token');
  await expectNothingSent(company);
});
