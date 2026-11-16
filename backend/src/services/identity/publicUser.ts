import type { HydratedDocument } from 'mongoose';
import type { User } from '../../models/user.model';
import type { AccountAccess } from './account.service';

export type Workspace = 'personal' | 'organization';

export function toPublicUser(user: HydratedDocument<User>, access: AccountAccess, workspace?: Workspace) {
  const personal = workspace === 'personal';
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    role: personal ? 'user' : access.role,
    orgId: personal ? null : (access.orgId ?? null),
    organizationMembership: access.membership,
    workspace: workspace ?? (access.membership ? 'organization' : 'personal'),
    hasCompletedOnboarding: user.hasCompletedOnboarding,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}
