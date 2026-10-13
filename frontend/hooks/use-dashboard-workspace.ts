"use client";

import { roleAccess, roleLabels } from "@/config/dashboard-roles";
import { useDashboardOverview } from "@/hooks/use-dashboard";

export function useDashboardWorkspace() {
  const overview = useDashboardOverview();
  const role = overview.data?.role;
  return {
    ...overview,
    access: roleAccess[role ?? "user"] ?? roleAccess.user,
    roleLabel: role ? roleLabels[role] ?? role : "",
  };
}
