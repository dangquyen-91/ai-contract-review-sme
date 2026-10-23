process.env.MONGOMS_DOWNLOAD_DIR = require('path').join(__dirname, '../node_modules/.cache/mongodb-memory-server');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { RoleModel, ROLE_CODES } = require('../dist/models/role.model');
const { UserModel } = require('../dist/models/user.model');
const { OrganizationInvitationModel, INVITATION_ROLES } = require('../dist/models/organizationInvitation.model');
const { seedDefaultRoles, getRoleByCode } = require('../dist/services/identity/role.service');

let mongo;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await RoleModel.init();
});
beforeEach(async () => {
  await Promise.all([RoleModel.deleteMany({}), UserModel.deleteMany({}), OrganizationInvitationModel.deleteMany({})]);
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test('new installations seed expert and accept expert invitations', async () => {
  await seedDefaultRoles();
  expect((await getRoleByCode('expert')).name).toBe('Expert');
  expect(ROLE_CODES).toContain('expert');
  expect(INVITATION_ROLES).toContain('expert');
  expect(ROLE_CODES).not.toContain('reviewer');
  expect(INVITATION_ROLES).not.toContain('reviewer');
});

test.each([false, true])('migrates legacy memberships and invitations, existing expert = %s', async (hasExpert) => {
  const legacyId = new mongoose.Types.ObjectId();
  // Bypass the current schema to reproduce data from the previous version.
  await RoleModel.collection.insertOne({ _id: legacyId, code: 'reviewer', name: 'Reviewer' });
  const existingExpert = hasExpert ? await RoleModel.create({ code: 'expert', name: 'Expert' }) : null;
  const member = await UserModel.create({ name: 'Member', email: 'member@example.com', passwordHash: 'unused', roleId: legacyId });
  const invitationId = new mongoose.Types.ObjectId();
  await OrganizationInvitationModel.collection.insertOne({ _id: invitationId, role: 'reviewer', status: 'pending' });

  await seedDefaultRoles();
  await seedDefaultRoles();

  const expert = await getRoleByCode('expert');
  expect(expert.id).toBe((existingExpert?._id ?? legacyId).toString());
  expect((await UserModel.findById(member.id)).roleId.toString()).toBe(expert.id);
  expect((await OrganizationInvitationModel.findById(invitationId)).role).toBe('expert');
  expect(await RoleModel.countDocuments({ code: 'expert' })).toBe(1);
  expect(await RoleModel.countDocuments({ code: 'reviewer' })).toBe(0);
});
