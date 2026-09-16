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
