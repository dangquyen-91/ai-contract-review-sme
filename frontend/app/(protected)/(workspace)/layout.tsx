import type { ReactNode } from "react";
import { SessionKeeper } from "@/components/auth/session-keeper";
import { DashboardProvider } from "@/providers/dashboard-provider";
import { getSession } from "@/lib/auth/session";
import { isOrganizationDashboardRole } from "@/lib/organization-dashboard-route";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = (await getSession())?.user ?? null;
  const organizationRole = user?.orgId && isOrganizationDashboardRole(user.role) ? user.role : undefined;
  return <DashboardProvider organizationRole={organizationRole} reviewRole={user?.role ?? "user"} hasWorkspace={Boolean(user?.orgId)}><SessionKeeper />{children}</DashboardProvider>;
}
