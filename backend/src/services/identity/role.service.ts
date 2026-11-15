import { AppError } from '../../errors/AppError';
import { RoleCode, RoleModel } from '../../models/role.model';
import { UserModel } from '../../models/user.model';
import { OrganizationInvitationModel } from '../../models/organizationInvitation.model';

const DEFAULT_ROLES: Array<{ code: RoleCode; name: string; description: string }> = [
  {
    code: 'administrator',
    name: 'Administrator',
    description: 'System administrator: manage user accounts and monitor system operations',
  },
  {
    code: 'manager',
    name: 'Manager',
    description: 'System manager: manage legal knowledge sources and look up organizations',
  },
  {
    code: 'staff',
    name: 'Staff',
    description: 'Organization member: upload, draft and review contracts in their organization',
  },
  {
    code: 'owner',
    name: 'Owner',
    description: 'Organization owner: manage organization settings, Staff, subscriptions and contracts',
  },
  {
    code: 'expert',
    name: 'Expert',
    description: 'Review and approve contracts within their scope',
  },
  {
    code: 'user',
    name: 'User',
    description: 'Normal user using system'
  }
];

export async function seedDefaultRoles(): Promise<void> {
  // Preserve existing memberships when upgrading the former reviewer role.
  const legacyRole = await RoleModel.findOne({ code: 'reviewer' });
  if (legacyRole) {
    const expertRole = await RoleModel.findOne({ code: 'expert' });
    if (expertRole) {
      await UserModel.updateMany({ roleId: legacyRole._id }, { $set: { roleId: expertRole._id } });
      await RoleModel.deleteOne({ _id: legacyRole._id });
    } else {
      await RoleModel.updateOne({ _id: legacyRole._id }, { $set: { code: 'expert', name: 'Expert' } });
    }
  }
  await OrganizationInvitationModel.updateMany({ role: 'reviewer' }, { $set: { role: 'expert' } });
  await OrganizationInvitationModel.updateMany(
    { role: { $ne: 'staff' }, status: 'pending' },
    { $set: { status: 'revoked' } },
  );

  await Promise.all(
    DEFAULT_ROLES.map((role) =>
      RoleModel.findOneAndUpdate(
        { code: role.code },
        { $setOnInsert: { code: role.code, name: role.name, isSystemRole: true }, $set: { description: role.description } },
        { upsert: true },
      ),
    ),
  );

  const independentRoles = await RoleModel.find({ code: { $in: ['administrator', 'manager', 'expert'] } });
  if (independentRoles.length) {
    await UserModel.updateMany(
      { roleId: { $in: independentRoles.map(role => role._id) }, orgId: { $ne: null } },
      { $unset: { orgId: 1 }, $set: { hasCompletedOnboarding: true }, $inc: { permissionsVersion: 1 } },
    );
  }
}

export async function getRoleByCode(code: RoleCode) {
  const role = await RoleModel.findOne({ code });
  if (!role) {
    throw AppError.internal(`Role "${code}" is not seeded`);
  }
  return role;
}
