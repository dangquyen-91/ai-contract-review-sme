import { AppError } from '../errors/AppError';
import { RoleCode, RoleModel } from '../models/role.model';

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
    code: 'reviewer',
    name: 'Reviewer',
    description: 'Review and approve contracts within their scope',
  },
  {
    code: 'user',
    name: 'User',
    description: 'Normal user using system'
  }
];

export async function seedDefaultRoles(): Promise<void> {
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
