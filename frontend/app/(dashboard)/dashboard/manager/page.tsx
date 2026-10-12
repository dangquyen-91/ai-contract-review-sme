import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ManagerDashboard } from "@/components/dashboard/manager-dashboard";
import { StaffOrganizationRequired } from "@/components/dashboard/staff-organization-required";
import { decodeSessionUser, userSessionCookie } from "@/lib/auth-session";
import { workspacePath } from "@/lib/workspace-path";

export const metadata: Metadata = {
  title: "Không gian quản lý | LawScan",
  robots: { index: false, follow: false },
};

export default async function ManagerPage() {
  const cookieStore = await cookies();
  const user = decodeSessionUser(cookieStore.get(userSessionCookie)?.value);
  if (!user) redirect("/dang-nhap");
  if (user.role !== "manager") redirect(workspacePath(user));
  if (!user.orgId) return <StaffOrganizationRequired email={user.email} role="manager" />;
  return <ManagerDashboard />;
}
