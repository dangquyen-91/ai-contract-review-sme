"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useLogoutWorkflow } from "@/hooks/use-logout-workflow";
import { useOrganizationWorkflow, type OrganizationWorkflow } from "@/hooks/use-organization-workflow";
import type { OrganizationDashboardRole } from "@/lib/organization-dashboard-route";

export type DashboardSession = {
  logout: () => Promise<void>;
  loggingOut: boolean;
};

type DashboardContextValue = DashboardSession & { workspace: OrganizationWorkflow | null };

export const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children, organizationRole }: { children: ReactNode; organizationRole?: OrganizationDashboardRole }) {
  const session = useLogoutWorkflow();
  return organizationRole
    ? <OrganizationDashboardState key={organizationRole} role={organizationRole} session={session}>{children}</OrganizationDashboardState>
    : <DashboardContext.Provider value={{ ...session, workspace: null }}>{children}</DashboardContext.Provider>;
}

function OrganizationDashboardState({ role, session, children }: { role: OrganizationDashboardRole; session: DashboardSession; children: ReactNode }) {
  const workspace = useOrganizationWorkflow(role);
  return <DashboardContext.Provider value={{ ...session, workspace }}>{children}</DashboardContext.Provider>;
}

export function useOrganizationDashboard() {
  const workspace = useOptionalOrganizationDashboard();
  if (!workspace) throw new Error("useOrganizationDashboard requires a DashboardProvider with an organization role");
  return workspace;
}

export function useOptionalOrganizationDashboard() {
  return useContext(DashboardContext)?.workspace ?? null;
}
