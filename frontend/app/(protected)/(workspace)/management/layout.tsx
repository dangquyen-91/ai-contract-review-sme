import type { ReactNode } from "react";
import { requirePermission } from "@/lib/auth/access";
import { ManagementDashboardShell } from "@/components/layouts/dashboard/management-dashboard-shell";
import { SystemDashboardShell } from "@/components/layouts/dashboard/system-dashboard-shell";
export default async function ManagementLayout({ children }: { children: ReactNode }) {
  const { user } = await requirePermission("managementArea");
  if (user.role === "administrator") {
    return <SystemDashboardShell name={user.name}>{children}</SystemDashboardShell>;
  }
  return <ManagementDashboardShell name={user.name}>{children}</ManagementDashboardShell>;
}
