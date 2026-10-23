import { AppError } from '../../errors/AppError';
import { RoleCode, RoleModel } from '../../models/role.model';
import { UserModel } from '../../models/user.model';
import { OrganizationInvitationModel } from '../../models/organizationInvitation.model';

const DEFAULT_ROLES: Array<{ code: RoleCode; name: string; description: string }> = [
  {
    code: 'administrator',
    name: 'Administrator',
    description: 'Full access: manage organization, users, and all contracts',
  },
  {
    code: 'manager',
    name: 'Manager',
    description: 'Manage contracts and review outcomes for the organization',
  },
  {
    code: 'staff',
    name: 'Staff',
    description: 'Upload and view contracts assigned to them',
  },
  {
    code: 'owner',
    name: 'Owner',
    description: 'Full access to manage their own contracts and review outcomes',
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

  await Promise.all(
    DEFAULT_ROLES.map((role) =>
      RoleModel.findOneAndUpdate(
        { code: role.code },
        { $setOnInsert: { ...role, isSystemRole: true } },
        { upsert: true },
      ),
    ),
  );
}

export async function getRoleByCode(code: RoleCode) {
  const role = await RoleModel.findOne({ code });
  if (!role) {
    throw AppError.internal(`Role "${code}" is not seeded`);
  }
  return role;
}
