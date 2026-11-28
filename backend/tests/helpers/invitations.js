// Shared setup for the members-and-invitations test cases (MEM-01 to MEM-09).
// Require this file first: it sets the environment before the app is loaded.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'member-cases-access';
process.env.JWT_REFRESH_SECRET = 'member-cases-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
const { createHash, randomBytes } = require('crypto');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const request = require('supertest');
const { createApp } = require('../../dist/app');
const { logger } = require('../../dist/config/logger');
logger.silent = true;
const { UserModel } = require('../../dist/models/user.model');
const { OrganizationModel } = require('../../dist/models/organization.model');
const { MembershipModel } = require('../../dist/models/membership.model');
const { OrganizationInvitationModel } = require('../../dist/models/organizationInvitation.model');
const { initializeSubscriptionModels } = require('../../dist/models/subscription.model');
const { seedPlans } = require('../../dist/services/billing/subscription.service');
const { seedDefaultRoles } = require('../../dist/services/identity/role.service');
const { createAccount } = require('./accounts');

const DAY = 24 * 60 * 60 * 1000;
let repl, app, sequence = 0;

async function start() {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  await seedDefaultRoles();
  await initializeSubscriptionModels();
  await seedPlans();
  await Promise.all([UserModel.init(), MembershipModel.init(), OrganizationInvitationModel.init()]);
  app = createApp();
}
async function stop() {
  await mongoose.disconnect();
  if (repl) await repl.stop();
}

const newEmail = () => `member-case-${++sequence}@example.com`;
const account = (role = 'user', orgId, extra = {}) =>
  createAccount({ role, orgId, name: 'Nguyễn Văn An', email: newEmail(), ...extra });

/** A new organization on the free plan (3 seats, one used by its Owner). */
async function ownerWithCompany(name = 'Công ty Minh Tâm') {
  const company = await OrganizationModel.create({ name });
  return { company, owner: await account('owner', company._id, { name: 'Trần Minh Tâm' }) };
}

/** Stores an invitation directly, bypassing email delivery. */
async function seedInvitation(company, owner, fields = {}) {
  const token = randomBytes(32).toString('hex');
  const invitation = await OrganizationInvitationModel.create({
    orgId: company._id,
    invitedBy: owner._id,
    email: newEmail(),
    role: 'staff',
    tokenHash: createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + 7 * DAY),
    ...fields,
  });
  return { token, invitation };
}

/** Sends a request under /api/v1, signed in as `user` when one is given. */
function call(method, path, user, body) {
  const pending = request(app)[method](`/api/v1${path}`);
  if (user) pending.set('Authorization', `Bearer ${user.testSession.accessToken}`);
  return body === undefined ? pending : pending.send(body);
}

const errorOf = (response) => response.body.error.message;
const statusOf = async (invitation) => (await OrganizationInvitationModel.findById(invitation._id)).status;
const membershipOf = (user) => MembershipModel.findOne({ userId: user._id }).lean();
const missingId = () => new mongoose.Types.ObjectId().toString();

module.exports = {
  DAY, start, stop, newEmail, account, ownerWithCompany, seedInvitation, call,
  errorOf, statusOf, membershipOf, missingId,
  UserModel, OrganizationModel, MembershipModel, OrganizationInvitationModel,
};
