process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'free-business-test-access';
process.env.JWT_REFRESH_SECRET = 'free-business-test-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_FROM = 'test@example.com';
process.env.MONGOMS_DOWNLOAD_DIR = require('path').join(__dirname, '../node_modules/.cache/mongodb-memory-server');

jest.mock('../dist/services/organization/invitationEmail.service', () => ({
  ensureInvitationEmailConfigured: jest.fn(),
  sendInvitationEmail: jest.fn().mockResolvedValue(undefined),
}));

const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { OrganizationModel } = require('../dist/models/organization.model');
const { UserModel } = require('../dist/models/user.model');
const { OrganizationInvitationModel } = require('../dist/models/organizationInvitation.model');
const { seedDefaultRoles, getRoleByCode } = require('../dist/services/identity/role.service');
const { createOrganization } = require('../dist/services/organization/organization.service');
const { createInvitation, revokeInvitation, acceptInvitation } = require('../dist/services/organization/invitation.service');
const { sendInvitationEmail } = require('../dist/services/organization/invitationEmail.service');
const { seedPlans, getSubscription } = require('../dist/services/billing/subscription.service');
const { initializeSubscriptionModels } = require('../dist/models/subscription.model');

let replicaSet;
let serial = 0;

async function makeUser(email, orgId) {
  const role = await getRoleByCode('user');
  return UserModel.create({
    name: 'Test user',
    email: email ?? `free-member-${++serial}@example.com`,
    passwordHash: 'unused',
    roleId: role._id,
    orgId,
  });
}

beforeAll(async () => {
  replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replicaSet.getUri());
  await seedDefaultRoles();
  await initializeSubscriptionModels();
  await seedPlans();
  await OrganizationInvitationModel.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (replicaSet) await replicaSet.stop();
});

test('a new free organization reserves two invitation seats and accepts two members', async () => {
  const owner = await makeUser();
  const organization = await createOrganization(owner.id, { name: 'Free team' });
  expect(await getSubscription(owner.id, organization.id)).toMatchObject({
    status: 'unsubscribed',
    members: { count: 1, pending: 0, limit: 3, available: 2 },
  });

  const first = await createInvitation(owner.id, organization.id, { email: 'first@example.com', role: 'staff' });
  const firstToken = sendInvitationEmail.mock.calls.at(-1)[0].token;
  const second = await createInvitation(owner.id, organization.id, { email: 'second@example.com', role: 'reviewer' });
  const secondToken = sendInvitationEmail.mock.calls.at(-1)[0].token;
  expect(await getSubscription(owner.id, organization.id)).toMatchObject({
    members: { count: 1, pending: 2, limit: 3, available: 0 },
  });
  await expect(createInvitation(owner.id, organization.id, {
    email: 'third@example.com', role: 'manager',
  })).rejects.toMatchObject({ statusCode: 403 });

  await revokeInvitation(owner.id, organization.id, second.id);
  expect(await getSubscription(owner.id, organization.id)).toMatchObject({
    members: { count: 1, pending: 1, limit: 3, available: 1 },
  });
  await createInvitation(owner.id, organization.id, { email: 'second@example.com', role: 'reviewer' });
  const replacementToken = sendInvitationEmail.mock.calls.at(-1)[0].token;

  const firstUser = await makeUser('first@example.com');
  await acceptInvitation(firstUser.id, firstToken);
  const secondUser = await makeUser('second@example.com');
  await acceptInvitation(secondUser.id, replacementToken);
  expect(await getSubscription(owner.id, organization.id)).toMatchObject({
    members: { count: 3, pending: 0, limit: 3, available: 0 },
  });
  await expect(createInvitation(owner.id, organization.id, {
    email: 'third@example.com', role: 'manager',
  })).rejects.toMatchObject({ statusCode: 403 });
  expect(first.id).toBeTruthy();
  expect(second.id).toBeTruthy();
  expect(secondToken).not.toBe(replacementToken);
});

test('personal workspaces remain limited to one member', async () => {
  const personal = await OrganizationModel.create({ name: 'Personal', isPersonal: true });
  const user = await makeUser(undefined, personal._id);
  expect(await getSubscription(user.id, personal.id)).toMatchObject({
    members: { count: 1, pending: 0, limit: 1, available: 0 },
  });
});

test('concurrent free invitations cannot reserve more than two seats', async () => {
  const owner = await makeUser();
  const organization = await createOrganization(owner.id, { name: 'Concurrent team' });
  const attempts = await Promise.allSettled(['a', 'b', 'c'].map((name) =>
    createInvitation(owner.id, organization.id, {
      email: `concurrent-${name}@example.com`,
      role: 'staff',
    }),
  ));
  expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(2);
  expect(attempts.filter((attempt) => attempt.status === 'rejected')).toHaveLength(1);
  expect(await getSubscription(owner.id, organization.id)).toMatchObject({
    members: { count: 1, pending: 2, limit: 3, available: 0 },
  });
});
