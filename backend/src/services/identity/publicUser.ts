import type { HydratedDocument } from 'mongoose';
import type { User } from '../../models/user.model';
import type { Role } from '../../models/role.model';

export function toPublicUser(
  user: HydratedDocument<User>,
  workspace?: 'personal' | 'organization',
) {
  const role = (user.roleId as unknown as Role).code;
  const membership =
    user.orgId && ['owner', 'staff'].includes(role) ? { orgId: user.orgId.toString(), role } : null;
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    role: workspace === 'personal' ? 'user' : role,
    orgId: workspace === 'personal' ? null : (user.orgId?.toString() ?? null),
    organizationMembership: membership,
    workspace: workspace ?? (membership ? 'organization' : 'personal'),
    hasCompletedOnboarding: user.hasCompletedOnboarding,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}
