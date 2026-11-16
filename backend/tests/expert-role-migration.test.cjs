process.env.MONGOMS_DOWNLOAD_DIR = require('path').join(__dirname, '../node_modules/.cache/mongodb-memory-server');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { RoleModel, ROLE_CODES } = require('../dist/models/role.model');
const { UserModel } = require('../dist/models/user.model');
const { OrganizationInvitationModel, INVITATION_ROLES } = require('../dist/models/organizationInvitation.model');
const { seedDefaultRoles } = require('../dist/services/identity/role.service');

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

test('new installations seed an independent expert and only allow Staff invitations', async () => {
  await seedDefaultRoles();
  expect((await RoleModel.findOne({ code: 'expert' })).name).toBe('Expert');
  // Seeding twice keeps one record per role.
  await seedDefaultRoles();
  expect(await RoleModel.countDocuments({ code: 'expert' })).toBe(1);
  expect(ROLE_CODES).toContain('expert');
  expect(INVITATION_ROLES).toEqual(['staff']);
  expect(ROLE_CODES).not.toContain('reviewer');
  expect(INVITATION_ROLES).not.toContain('reviewer');
});
