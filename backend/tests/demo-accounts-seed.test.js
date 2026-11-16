process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'demo-seed-access';
process.env.JWT_REFRESH_SECRET = 'demo-seed-refresh';
process.env.MONGOMS_DOWNLOAD_DIR = require('path').join(
  __dirname,
  '../node_modules/.cache/mongodb-memory-server',
);

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const {
  seedDemoAccounts,
  DEMO_ACCOUNTS,
  DEMO_ORGANIZATION_ID,
} = require('../dist/services/identity/demoAccounts.seed');
const { loadAccess } = require('../dist/services/identity/account.service');
const { login } = require('../dist/services/identity/auth.service');
const { UserModel } = require('../dist/models/user.model');
const { MembershipModel } = require('../dist/models/membership.model');
const { OrganizationModel } = require('../dist/models/organization.model');
const password = 'Demo-seed!test-2026';
let mongo;
beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Promise.all([UserModel.init(), MembershipModel.init(), OrganizationModel.init()]);
});
beforeEach(async () => {
  await Promise.all([
    UserModel.deleteMany({}),
    MembershipModel.deleteMany({}),
    OrganizationModel.deleteMany({}),
  ]);
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test('all six accounts can log in with the exact role and Owner/Staff share one organization', async () => {
  const result = await seedDemoAccounts(password);
  expect(result.accounts).toHaveLength(6);
  expect(result.accounts.every((row) => row.created)).toBe(true);
  for (const account of result.accounts) {
    const auth = await login({ email: account.email, password });
    expect(auth.access.role).toBe(account.role);
    expect(auth.user.hasCompletedOnboarding).toBe(true);
    expect(auth.user.emailVerifiedAt).toBeTruthy();
    expect(auth.access.orgId).toBe(
      ['owner', 'staff'].includes(account.role) ? String(DEMO_ORGANIZATION_ID) : undefined,
    );
  }
  expect(await MembershipModel.countDocuments({})).toBe(2);
});

test('rerunning preserves passwords, membership IDs and unrelated users', async () => {
  const unrelated = await UserModel.create({
    name: 'Existing account',
    email: 'existing@example.com',
    passwordHash: await bcrypt.hash('Original-password-2026!', 10),
  });
  await seedDemoAccounts(password);
  const before = await MembershipModel.find().sort({ role: 1 }).lean();
  const result = await seedDemoAccounts('Different-password-2026!');
  expect(result.accounts.every((row) => !row.created)).toBe(true);
  expect(await UserModel.countDocuments({})).toBe(7);
  expect(await OrganizationModel.countDocuments({})).toBe(1);
  expect(
    (await MembershipModel.find().sort({ role: 1 }).lean()).map((row) => String(row._id)),
  ).toEqual(before.map((row) => String(row._id)));
  for (const definition of DEMO_ACCOUNTS) {
    const user = await UserModel.findOne({ email: definition.email }).select('+passwordHash');
    expect(await bcrypt.compare(password, user.passwordHash)).toBe(true);
    expect((await loadAccess(user)).role).toBe(definition.role);
  }
  const existing = await UserModel.findById(unrelated._id).select('+passwordHash');
  expect(await bcrypt.compare('Original-password-2026!', existing.passwordHash)).toBe(true);
});

test('an existing email collision rolls back account and organization creation', async () => {
  await UserModel.create({
    name: 'Existing manager',
    email: 'manager@demo.lawscan.test',
    passwordHash: 'unchanged',
  });
  await expect(seedDemoAccounts(password)).rejects.toThrow('Email hoặc ID demo');
  expect(await UserModel.countDocuments({})).toBe(1);
  expect(await OrganizationModel.countDocuments({})).toBe(0);
  expect(await MembershipModel.countDocuments({})).toBe(0);
});
