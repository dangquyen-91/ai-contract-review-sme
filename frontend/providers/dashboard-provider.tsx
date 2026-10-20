"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useLogoutWorkflow } from "@/hooks/use-logout-workflow";
import { useOrganizationWorkflow, type OrganizationWorkflow } from "@/hooks/use-organization-workflow";
import type { OrganizationDashboardRole } from "@/lib/organization-dashboard-route";
import { ReviewWorkflowProvider } from "@/providers/review-workflow-provider";

export type DashboardSession = {
  logout: () => Promise<void>;
  loggingOut: boolean;
};

type DashboardContextValue = DashboardSession & { workspace: OrganizationWorkflow | null };

export const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children, organizationRole, reviewRole = "user", hasWorkspace = true }: { children: ReactNode; organizationRole?: OrganizationDashboardRole; reviewRole?: string; hasWorkspace?: boolean }) {
  const session = useLogoutWorkflow();
  if (!hasWorkspace) return <DashboardContext.Provider value={{ ...session, workspace: null }}>{children}</DashboardContext.Provider>;
  return <ReviewWorkflowProvider initialRole={organizationRole ?? reviewRole}>{organizationRole
    ? <OrganizationDashboardState key={organizationRole} role={organizationRole} session={session}>{children}</OrganizationDashboardState>
    : <DashboardContext.Provider value={{ ...session, workspace: null }}>{children}</DashboardContext.Provider>}</ReviewWorkflowProvider>;
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
