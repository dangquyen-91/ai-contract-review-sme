import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { StaffOrganizationRequired } from "@/components/organizations/staff-organization-required";
import { getSession } from "@/lib/auth/session";
import { workspacePath } from "@/lib/workspace-path";
import type { OrganizationDashboardRole } from "@/lib/organization-dashboard-route";
import { OrganizationDashboardFrame } from "@/components/layouts/dashboard/organization-workspace";

export async function DashboardAccessLayout({ role, children }: { role: "user" | OrganizationDashboardRole; children: ReactNode }) {
  const user = (await getSession())?.user ?? null;
  if (!user) redirect("/dang-nhap");
  if (user.role !== role) redirect(workspacePath(user));

  if (role === "user") {
    return children;
  }

  if (!user.orgId) {
    if (role === "owner") redirect("/chon-to-chuc");
    return <StaffOrganizationRequired email={user.email} role={role} />;
  }
  return <OrganizationDashboardFrame role={role}>{children}</OrganizationDashboardFrame>;
}
