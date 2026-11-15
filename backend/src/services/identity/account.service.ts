import { ClientSession, Types } from 'mongoose';
import { MembershipModel, MembershipRole } from '../../models/membership.model';
import { RoleCode } from '../../models/role.model';
import { PlatformRole } from '../../models/user.model';

export interface AccountMembership {
  orgId: string;
  role: MembershipRole;
}

export interface AccountAccess {
  role: RoleCode;
  orgId?: string;
  membership: AccountMembership | null;
}

interface AccountUser {
  _id: Types.ObjectId | string;
  platformRole?: PlatformRole | null;
}

export const PERSONAL_ROLES: RoleCode[] = ['user', 'owner', 'staff'];

export function accessOf(
  user: Pick<AccountUser, 'platformRole'>,
  membership?: { orgId: unknown; role: MembershipRole } | null,
): AccountAccess {
  if (user.platformRole) return { role: user.platformRole, membership: null };
  if (!membership) return { role: 'user', membership: null };
  const orgId = String(membership.orgId);
  return { role: membership.role, orgId, membership: { orgId, role: membership.role } };
}

export async function loadAccess(
  user: AccountUser,
  session?: ClientSession,
): Promise<AccountAccess> {
  if (user.platformRole) return accessOf(user);
  const membership = await MembershipModel.findOne({ userId: user._id })
    .session(session ?? null)
    .lean();
  return accessOf(user, membership);
}

export function findMembership(
  userId: string | Types.ObjectId,
  orgId: string,
  session?: ClientSession,
) {
  return MembershipModel.findOne({ userId, orgId }).session(session ?? null);
}

export function countMembers(orgId: string, session?: ClientSession) {
  return MembershipModel.countDocuments({ orgId }).session(session ?? null);
}
