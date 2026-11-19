process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'legacy-migration-access';
process.env.JWT_REFRESH_SECRET = 'legacy-migration-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.MONGOMS_DOWNLOAD_DIR = require('path').join(__dirname, '../node_modules/.cache/mongodb-memory-server');

const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { migrateLegacyAccounts } = require('../dist/migrations/legacyAccounts.migration');
const { seedDefaultRoles } = require('../dist/services/identity/role.service');
const { seedPlans, getSubscription } = require('../dist/services/billing/subscription.service');
const { sessionFor } = require('../dist/services/identity/auth.service');
const { RoleModel } = require('../dist/models/role.model');
const { UserModel } = require('../dist/models/user.model');
const { OrganizationModel } = require('../dist/models/organization.model');
const { MembershipModel } = require('../dist/models/membership.model');
const { OrganizationInvitationModel } = require('../dist/models/organizationInvitation.model');
const { ContractModel } = require('../dist/models/contract.model');
const { ContractDraftModel } = require('../dist/models/contractDraft.model');
const { PaymentModel } = require('../dist/models/payment.model');
const {
  PlanModel,
  SubscriptionModel,
  SubscriptionPeriodModel,
  initializeSubscriptionModels,
} = require('../dist/models/subscription.model');

let repl, legacy;
const id = () => new mongoose.Types.ObjectId();
const DAY = 24 * 60 * 60 * 1000;

// Seeds documents exactly as the pre-membership code stored them, bypassing schemas.
async function seedLegacyData() {
  const roleId = async (code) => (await RoleModel.findOne({ code }))._id;
  const reviewerRole = id();
  await RoleModel.collection.insertOne({ _id: reviewerRole, code: 'reviewer', name: 'Reviewer' });
  const users = UserModel.collection;
  const account = async (email, roleIdValue, orgId) => {
    const _id = id();
    await users.insertOne({
      _id, name: email, email, passwordHash: 'unused', emailVerifiedAt: new Date(),
      isActive: true, createdAt: new Date('2026-10-01'), roleId: roleIdValue, ...(orgId ? { orgId } : {}),
    });
    return _id;
  };
  const business = id();
  const personalOrg = id();
  const sharedOrg = id();
  await OrganizationModel.collection.insertMany([
    { _id: business, name: 'Legacy company', isPersonal: false },
    { _id: personalOrg, name: 'Personal', isPersonal: true },
    { _id: sharedOrg, name: 'Shared personal', isPersonal: true },
  ]);
  const data = {
    business,
    personalOrg,
    sharedOrg,
    owner: await account('owner@legacy.test', await roleId('owner'), business),
    staff: await account('staff@legacy.test', await roleId('staff'), business),
    secondOwner: await account('second-owner@legacy.test', await roleId('owner'), business),
    admin: await account('admin@legacy.test', await roleId('administrator'), business),
    reviewer: await account('reviewer@legacy.test', reviewerRole),
    personal: await account('personal@legacy.test', await roleId('user'), personalOrg),
    sharedA: await account('shared-a@legacy.test', await roleId('user'), sharedOrg),
    sharedB: await account('shared-b@legacy.test', await roleId('user'), sharedOrg),
    orphanOwner: await account('orphan@legacy.test', await roleId('owner')),
  };
  const pro = await PlanModel.findOne({ code: 'personal_pro' }).lean();
  data.period = id();
  await SubscriptionPeriodModel.collection.insertOne({
    _id: data.period, orgId: personalOrg, key: 'payment:legacy-pro', paymentReference: 'legacy-pro',
    paymentAction: 'purchase', plan: pro, startsAt: new Date(Date.now() - DAY), endsAt: new Date(Date.now() + 20 * DAY),
    analysisUsed: 4, analysisReserved: 0, chatUsed: 0, chatReserved: 0, draftingUsed: 0, draftingReserved: 0,
  });
  await SubscriptionModel.collection.insertOne({ orgId: personalOrg, accountType: 'organization' });
  data.personalContract = id();
  data.businessContract = id();
  await ContractModel.collection.insertMany([
    { _id: data.personalContract, orgId: personalOrg, uploadedBy: data.personal, title: 'Personal lease', status: 'uploaded' },
    { _id: data.businessContract, orgId: business, uploadedBy: data.staff, title: 'Supplier', status: 'uploaded' },
  ]);
  data.draft = id();
  await ContractDraftModel.collection.insertOne({ _id: data.draft, orgId: personalOrg, createdBy: data.personal, title: 'Draft' });
  // A business draft saved while ownerType was missing from the schema.
  data.businessDraft = id();
  await ContractDraftModel.collection.insertOne({ _id: data.businessDraft, orgId: business, createdBy: data.staff, title: 'Business draft' });
  data.payment = id();
  await PaymentModel.collection.insertOne({
    _id: data.payment, orgId: personalOrg, orderCode: 9300000000001, idempotencyKey: 'legacy-key',
    createdBy: data.personal, planCode: 'personal_pro', action: 'purchase', amount: 99000, currency: 'VND',
    status: 'paid', isOpen: false, expiresAt: new Date(),
  });
  data.strayInvitation = id();
  await OrganizationInvitationModel.collection.insertOne({
    _id: data.strayInvitation, orgId: business, email: 'manager@legacy.test', role: 'manager',
    status: 'pending', tokenHash: 'legacy-token', expiresAt: new Date(Date.now() + DAY),
  });
  return data;
}

beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  await seedDefaultRoles();
  await initializeSubscriptionModels();
  await Promise.all([MembershipModel.init(), PaymentModel.init(), OrganizationInvitationModel.init()]);
  await seedPlans();
  legacy = await seedLegacyData();
});
afterAll(async () => {
  await mongoose.disconnect();
  if (repl) await repl.stop();
});

const skippedEmails = (report) => report.skipped.map((row) => row.email).sort();

test('dry run reports every change and conflict without writing anything', async () => {
  const report = await migrateLegacyAccounts();
  expect(report).toMatchObject({
    applied: false,
    memberships: 2,
    platformRoles: 2,
    personalWorkspaces: 1,
    personalAccounts: 1,
    contractOwnerTypes: { personal: 1, organization: 1 },
    draftOwnerTypes: { personal: 1, organization: 1 },
    revokedInvitations: 1,
  });
  expect(skippedEmails(report)).toEqual(['second-owner@legacy.test', 'shared-a@legacy.test', 'shared-b@legacy.test']);
  expect(await MembershipModel.countDocuments()).toBe(0);
  expect(await OrganizationModel.exists({ _id: legacy.personalOrg })).toBeTruthy();
  expect((await ContractModel.collection.findOne({ _id: legacy.personalContract })).orgId).toEqual(legacy.personalOrg);
  expect((await UserModel.findById(legacy.admin)).platformRole).toBeUndefined();
  expect((await OrganizationInvitationModel.findById(legacy.strayInvitation)).status).toBe('pending');
});

test('apply restores organization roles, system roles and personal workspaces, then is a no-op', async () => {
  const report = await migrateLegacyAccounts({ apply: true });
  expect(report).toMatchObject({ applied: true, memberships: 2, platformRoles: 2, personalWorkspaces: 1, personalAccounts: 1 });
  expect(report.contractOwnerTypes).toEqual({ personal: 0, organization: 1 });
  expect(skippedEmails(report)).toEqual(['second-owner@legacy.test', 'shared-a@legacy.test', 'shared-b@legacy.test']);

  // Organization members keep their organization and role.
  expect(await MembershipModel.findOne({ userId: legacy.owner }).lean()).toMatchObject({ orgId: legacy.business, role: 'owner' });
  expect(await MembershipModel.findOne({ userId: legacy.staff }).lean()).toMatchObject({ orgId: legacy.business, role: 'staff' });
  expect((await sessionFor(await UserModel.findById(legacy.staff))).access).toMatchObject({ role: 'staff', orgId: String(legacy.business) });
  expect(await MembershipModel.exists({ userId: legacy.secondOwner })).toBeNull();

  // System accounts are detached from organizations; the old reviewer becomes an expert.
  expect((await UserModel.findById(legacy.admin)).platformRole).toBe('administrator');
  expect(await MembershipModel.exists({ userId: legacy.admin })).toBeNull();
  expect((await UserModel.findById(legacy.reviewer)).platformRole).toBe('expert');

  // The personal workspace moves to the user's own scope, keeping the paid plan and usage.
  const personal = String(legacy.personal);
  expect(await ContractModel.findById(legacy.personalContract).lean()).toMatchObject({ orgId: legacy.personal, ownerType: 'personal' });
  expect(await ContractDraftModel.collection.findOne({ _id: legacy.draft })).toMatchObject({ orgId: null, ownerType: 'personal' });
  expect((await ContractDraftModel.collection.findOne({ _id: legacy.businessDraft })).ownerType).toBe('organization');
  expect((await PaymentModel.findById(legacy.payment)).orgId.toString()).toBe(personal);
  expect(await SubscriptionModel.findOne({ orgId: legacy.personal }).lean()).toMatchObject({ accountType: 'personal' });
  expect(await getSubscription(personal, personal)).toMatchObject({
    status: 'active', periodId: String(legacy.period), plan: { code: 'personal_pro' }, analysis: { used: 4 },
  });
  expect(await OrganizationModel.exists({ _id: legacy.personalOrg })).toBeNull();
  expect(await mongoose.connection.collection('legacymigrations').countDocuments({ userId: legacy.personal })).toBe(1);
  // A shared personal workspace is left untouched for manual review.
  expect(await OrganizationModel.exists({ _id: legacy.sharedOrg })).toBeTruthy();

  expect((await ContractModel.findById(legacy.businessContract)).ownerType).toBe('organization');
  expect((await OrganizationInvitationModel.findById(legacy.strayInvitation)).status).toBe('revoked');

  const again = await migrateLegacyAccounts({ apply: true });
  expect(again).toMatchObject({
    memberships: 0, platformRoles: 0, personalWorkspaces: 0, personalAccounts: 0,
    contractOwnerTypes: { personal: 0, organization: 0 }, draftOwnerTypes: { personal: 0, organization: 0 }, revokedInvitations: 0,
  });
  // Conflicts stay visible on every run until someone resolves them.
  expect(skippedEmails(again)).toEqual(['second-owner@legacy.test', 'shared-a@legacy.test', 'shared-b@legacy.test']);
  expect(await MembershipModel.countDocuments()).toBe(2);
});
