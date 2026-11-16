// Test accounts for the membership model: organization roles (owner/staff) live in
// a Membership, system roles on User.platformRole, and anyone else is a standalone
// personal account billed under their own user ID.
const { UserModel } = require('../../dist/models/user.model');
const { MembershipModel } = require('../../dist/models/membership.model');
const { sessionFor } = require('../../dist/services/identity/auth.service');

const PLATFORM_ROLES = ['administrator', 'manager', 'expert'];
const ORGANIZATION_ROLES = ['owner', 'staff'];

/**
 * Creates a verified account. `orgId` only grants a membership for owner/staff;
 * pass `strayMembership: true` to attach one to a platform account on purpose.
 * The returned document carries `roleCode` and a remembered `testSession`.
 */
async function createAccount({ role = 'user', orgId, strayMembership = false, ...fields } = {}) {
  const account = await UserModel.create({
    name: 'Test account',
    passwordHash: 'unused',
    emailVerifiedAt: new Date(),
    ...fields,
    ...(PLATFORM_ROLES.includes(role) ? { platformRole: role } : {}),
  });
  if (orgId && (ORGANIZATION_ROLES.includes(role) || strayMembership))
    await MembershipModel.create({
      userId: account._id,
      orgId,
      role: role === 'owner' ? 'owner' : 'staff',
    });
  account.roleCode = PLATFORM_ROLES.includes(role) || (orgId && ORGANIZATION_ROLES.includes(role)) ? role : 'user';
  account.testSession = await sessionFor(account, true);
  return account;
}

/** Fresh tokens reflecting the account's current memberships and permissions. */
async function sessionOf(account, remember = true, workspace) {
  return sessionFor(await UserModel.findById(account._id ?? account.id), remember, workspace);
}

/** The organization ID the user belongs to, or undefined for a personal account. */
async function organizationOf(userId) {
  return (await MembershipModel.findOne({ userId }))?.orgId.toString();
}

module.exports = { createAccount, sessionOf, organizationOf, PLATFORM_ROLES };
