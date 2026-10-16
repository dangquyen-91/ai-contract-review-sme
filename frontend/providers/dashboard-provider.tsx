"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLogoutMutation } from "@/hooks/use-auth";
import { useOrganizationWorkflow, type OrganizationWorkflow } from "@/hooks/use-organization-workflow";
import type { OrganizationDashboardRole } from "@/lib/organization-dashboard-route";

export type DashboardSession = {
  logout: () => Promise<void>;
  loggingOut: boolean;
};

type DashboardContextValue = DashboardSession & { workspace: OrganizationWorkflow | null };

export const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children, organizationRole }: { children: ReactNode; organizationRole?: OrganizationDashboardRole }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const logoutMutation = useLogoutMutation();
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutMutation.mutateAsync();
      queryClient.clear();
      router.replace("/dang-nhap");
      router.refresh();
    } catch {
      setLoggingOut(false);
      toast.error("Không thể đăng xuất. Vui lòng thử lại.");
    }
  }, [loggingOut, logoutMutation, queryClient, router]);

  const session = { logout, loggingOut };
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
