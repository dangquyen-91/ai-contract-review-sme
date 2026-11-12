import { RoleCode, RoleModel, RoleScope } from '../../models/role.model';

const DEFAULT_ROLES: Array<{
  code: RoleCode;
  name: string;
  description: string;
  scope: RoleScope;
}> = [
  {
    code: 'administrator',
    name: 'Administrator',
    description: 'System administrator: manage user accounts and monitor system operations',
    scope: 'platform',
  },
  {
    code: 'manager',
    name: 'Manager',
    description: 'System manager: manage legal knowledge sources and look up organizations',
    scope: 'platform',
  },
  {
    code: 'expert',
    name: 'Expert',
    description:
      'LawScan lawyer: verify AI review results sent by organizations and personal accounts',
    scope: 'platform',
  },
  {
    code: 'owner',
    name: 'Owner',
    description:
      'Organization owner: manage organization settings, Staff, subscriptions and contracts',
    scope: 'organization',
  },
  {
    code: 'staff',
    name: 'Staff',
    description: 'Organization member: upload, draft and review contracts in their organization',
    scope: 'organization',
  },
  {
    code: 'user',
    name: 'User',
    description: 'Personal account: upload, draft and review their own contracts',
    scope: 'personal',
  },
];

export async function seedDefaultRoles(): Promise<void> {
  await Promise.all(
    DEFAULT_ROLES.map(({ code, name, description, scope }) =>
      RoleModel.findOneAndUpdate(
        { code },
        { $setOnInsert: { code, name, isSystemRole: true }, $set: { description, scope } },
        { upsert: true },
      ),
    ),
  );
}
