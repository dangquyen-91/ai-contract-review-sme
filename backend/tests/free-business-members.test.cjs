process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'free-business-test-access';
process.env.JWT_REFRESH_SECRET = 'free-business-test-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.MONGOMS_DOWNLOAD_DIR = require('path').join(__dirname, '../node_modules/.cache/mongodb-memory-server');

jest.mock('../dist/services/organization/invitationEmail.service', () => ({
  ensureInvitationEmailConfigured: jest.fn(),
  sendInvitationEmail: jest.fn().mockResolvedValue(undefined),
}));

const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { UserModel } = require('../dist/models/user.model');
const { OrganizationInvitationModel } = require('../dist/models/organizationInvitation.model');
const { seedDefaultRoles } = require('../dist/services/identity/role.service');
const { createOrganization } = require('../dist/services/organization/organization.service');
const { createInvitation, revokeInvitation, acceptInvitation } = require('../dist/services/organization/invitation.service');
const { sendInvitationEmail } = require('../dist/services/organization/invitationEmail.service');
const { seedPlans, getSubscription, activatePaidSubscription } = require('../dist/services/billing/subscription.service');
const { initializeSubscriptionModels, SubscriptionPeriodModel } = require('../dist/models/subscription.model');
const { deleteOrganization } = require('../dist/services/organization/organization.service');
const { reserveUsage, finishUsage } = require('../dist/services/billing/usage.service');
const { quoteTopUp, seedTopUpPacks } = require('../dist/services/billing/topUp.service');
const { ContractModel } = require('../dist/models/contract.model');
const { MembershipModel } = require('../dist/models/membership.model');

let replicaSet;
let serial = 0;

async function makeUser(email) {
  return UserModel.create({
    name: 'Test user',
    email: email ?? `free-member-${++serial}@example.com`,
    passwordHash: 'unused',
    emailVerifiedAt: new Date(),
  });
}

beforeAll(async () => {
  replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replicaSet.getUri());
  await seedDefaultRoles();
  await initializeSubscriptionModels();
  await seedPlans();
  await seedTopUpPacks();
  await Promise.all([OrganizationInvitationModel.init(), MembershipModel.init()]);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (replicaSet) await replicaSet.stop();
});

test('a new free organization reserves two invitation seats and accepts two members', async () => {
  const owner = await makeUser();
  const organization = await createOrganization(owner.id, { name: 'Free team' });
  expect(await getSubscription(owner.id, organization.id)).toMatchObject({
    // A new organization starts on its one-time trial; seats match the free organization.
    status: 'active',
    plan: { code: 'business_trial' },
    members: { count: 1, pending: 0, limit: 3, available: 2 },
  });

  const first = await createInvitation(owner.id, organization.id, { email: 'first@example.com', role: 'staff' });
  const firstToken = sendInvitationEmail.mock.calls.at(-1)[0].token;
  const second = await createInvitation(owner.id, organization.id, { email: 'second@example.com', role: 'staff' });
  const secondToken = sendInvitationEmail.mock.calls.at(-1)[0].token;
  expect(await getSubscription(owner.id, organization.id)).toMatchObject({
    members: { count: 1, pending: 2, limit: 3, available: 0 },
  });
  await expect(createInvitation(owner.id, organization.id, {
    email: 'third@example.com', role: 'staff',
  })).rejects.toMatchObject({ statusCode: 403 });

  await revokeInvitation(owner.id, organization.id, second.id);
  expect(await getSubscription(owner.id, organization.id)).toMatchObject({
    members: { count: 1, pending: 1, limit: 3, available: 1 },
  });
  await createInvitation(owner.id, organization.id, { email: 'second@example.com', role: 'staff' });
  const replacementToken = sendInvitationEmail.mock.calls.at(-1)[0].token;

  const firstUser = await makeUser('first@example.com');
  await acceptInvitation(firstUser.id, firstToken);
  const secondUser = await makeUser('second@example.com');
  await acceptInvitation(secondUser.id, replacementToken);
  expect(await getSubscription(owner.id, organization.id)).toMatchObject({
    members: { count: 3, pending: 0, limit: 3, available: 0 },
  });
  await expect(createInvitation(owner.id, organization.id, {
    email: 'third@example.com', role: 'staff',
  })).rejects.toMatchObject({ statusCode: 403 });
  expect(first.id).toBeTruthy();
  expect(second.id).toBeTruthy();
  expect(secondToken).not.toBe(replacementToken);
});

test.each(['manager', 'expert'])('invitation service rejects %s without reserving seats or sending email', async (role) => {
  const owner = await makeUser();
  const organization = await createOrganization(owner.id, { name: 'Staff-only team' });
  const deliveriesBefore = sendInvitationEmail.mock.calls.length;
  await expect(createInvitation(owner.id, organization.id, {
    email: 'forbidden@example.com', role,
  })).rejects.toMatchObject({ statusCode: 400 });
  expect(sendInvitationEmail.mock.calls.length).toBe(deliveriesBefore);
  expect(await OrganizationInvitationModel.countDocuments({ orgId: organization.id })).toBe(0);
  expect((await getSubscription(owner.id, organization.id)).members.available).toBe(2);
});

test('personal workspaces remain limited to one member', async () => {
  // A standalone personal account is billed under its own user ID.
  const user = await makeUser();
  expect(await getSubscription(user.id, user.id)).toMatchObject({
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


const DAY = 24 * 60 * 60 * 1000;
const chat = async (owner, organization) => {
  const contract = await ContractModel.create({ ownerType: 'organization', orgId: organization._id, uploadedBy: owner._id, title: 'Trial contract' });
  return { orgId: organization.id, userId: owner.id, contractId: contract.id, kind: 'chat', idempotencyKey: `trial-${++serial}`, payload: { message: 'hello' } };
};

test('a new organization gets a 7-day trial with 5 reviews, 30 chats and 5 drafts that AI usage spends', async () => {
  const owner = await makeUser();
  const organization = await createOrganization(owner.id, { name: 'Trial team' });
  const subscription = await getSubscription(owner.id, organization.id);
  expect(subscription).toMatchObject({
    status: 'active',
    plan: { code: 'business_trial', price: 0 },
    analysis: { limit: 5 },
    chat: { limit: 30 },
    drafting: { limit: 5 },
    renewal: { status: 'none' },
    trial: { endingSoon: false },
  });
  const days = (new Date(subscription.trial.endsAt) - Date.now()) / DAY;
  expect(days).toBeGreaterThan(6.99);
  expect(days).toBeLessThanOrEqual(7);
  const { run } = await reserveUsage(await chat(owner, organization));
  await finishUsage(organization.id, run.id, true, { reply: 'ok' });
  expect((await getSubscription(owner.id, organization.id)).chat).toMatchObject({ used: 1, available: 29 });
  // Top-ups are for paid plans only.
  await expect(quoteTopUp(organization.id, 'business_chat_300')).rejects.toMatchObject({ code: 'PAID_PLAN_REQUIRED' });
});

test('after the trial ends AI needs a plan, and buying a plan during the trial takes over immediately', async () => {
  const owner = await makeUser();
  const organization = await createOrganization(owner.id, { name: 'Expiring trial' });
  await SubscriptionPeriodModel.updateOne({ key: `trial:${owner.id}` }, { $set: { endsAt: new Date(Date.now() + 2 * DAY) } });
  expect((await getSubscription(owner.id, organization.id)).trial).toMatchObject({ endingSoon: true });
  await SubscriptionPeriodModel.updateOne({ key: `trial:${owner.id}` }, { $set: { endsAt: new Date(Date.now() - 1000) } });
  expect(await getSubscription(owner.id, organization.id)).toMatchObject({ status: 'unsubscribed', plan: null, trial: null });
  await expect(reserveUsage(await chat(owner, organization))).rejects.toMatchObject({ code: 'AI_PLAN_REQUIRED' });

  const buyer = await makeUser();
  const team = await createOrganization(buyer.id, { name: 'Buys during trial' });
  await activatePaidSubscription({ orgId: team.id, planCode: 'business_starter', amount: 499000, action: 'purchase', paymentReference: `trial-buy-${team.id}` });
  expect(await getSubscription(buyer.id, team.id)).toMatchObject({ plan: { code: 'business_starter' }, trial: null, analysis: { limit: 200 } });
});

test('each owner gets the trial once, even after deleting and re-creating the organization', async () => {
  const owner = await makeUser();
  const first = await createOrganization(owner.id, { name: 'First try' });
  await deleteOrganization(first.id, first.id, owner.id);
  const second = await createOrganization(owner.id, { name: 'Second try' });
  expect(await getSubscription(owner.id, second.id)).toMatchObject({ status: 'unsubscribed', trial: null });
  expect(await SubscriptionPeriodModel.countDocuments({ key: `trial:${owner.id}` })).toBe(1);
});
