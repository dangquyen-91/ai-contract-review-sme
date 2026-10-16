import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StaffOrganizationRequired } from "@/components/organizations/staff-organization-required";
import { decodeSessionUser, userSessionCookie } from "@/lib/auth-session";
import { needsOnboarding, workspacePath } from "@/lib/workspace-path";
import type { OrganizationDashboardRole } from "@/lib/organization-dashboard-route";
import { OrganizationDashboardFrame } from "@/components/layouts/dashboard/organization-workspace";

export async function DashboardAccessLayout({ role, children }: { role: "user" | OrganizationDashboardRole; children: ReactNode }) {
  const cookieStore = await cookies();
  const user = decodeSessionUser(cookieStore.get(userSessionCookie)?.value);
  if (!user) redirect("/dang-nhap");
  if (user.role !== role) redirect(workspacePath(user));

  if (role === "user") {
    if (needsOnboarding(user)) redirect("/chon-to-chuc");
    return children;
  }

  if (!user.orgId) {
    if (role === "owner") redirect("/chon-to-chuc");
    return <StaffOrganizationRequired email={user.email} role={role} />;
  }
  return <OrganizationDashboardFrame role={role}>{children}</OrganizationDashboardFrame>;
}
