import { AppError } from '../../errors/AppError';
import type { MembershipRole } from '../../models/membership.model';
import { OrganizationModel } from '../../models/organization.model';
import { UserModel } from '../../models/user.model';
import { getSubscription } from '../billing/subscription.service';
import { loadAccess, PERSONAL_ROLES } from './account.service';

type WorkspaceKey = 'personal' | 'organization';
type WorkspaceRef = { key: WorkspaceKey; id: string; name: string; role: MembershipRole | null };

/** The plan and the review and drafting units left in one workspace, as seen by `userId`. */
async function summarize(userId: string, workspace: WorkspaceRef) {
  const subscription = await getSubscription(userId, workspace.id);
  return {
    ...workspace,
    status: subscription.status,
    plan: subscription.plan ? { code: subscription.plan.code, name: subscription.plan.name } : null,
    analysis: { available: subscription.analysis.available, limit: subscription.analysis.limit },
    drafting: { available: subscription.drafting.available, limit: subscription.drafting.limit },
  };
}

/** The workspaces a user can switch between, with the plan and units left in each. */
export async function listWorkspaces(userId: string) {
  const user = await UserModel.findOne({ _id: userId, isActive: true });
  if (!user) throw AppError.unauthorized('User is inactive or no longer exists');
  const access = await loadAccess(user);
  const workspaces: WorkspaceRef[] = [];
  if (PERSONAL_ROLES.includes(access.role))
    workspaces.push({ key: 'personal', id: user.id, name: user.name, role: null });
  if (access.membership) {
    const organization = await OrganizationModel.findById(access.membership.orgId).select('name');
    if (organization)
      workspaces.push({ key: 'organization', id: organization.id, name: organization.name, role: access.membership.role });
  }
  return { items: await Promise.all(workspaces.map((workspace) => summarize(user.id, workspace))) };
}
