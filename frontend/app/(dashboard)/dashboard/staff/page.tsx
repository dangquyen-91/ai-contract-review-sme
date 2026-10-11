import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { UserDashboard } from "@/components/dashboard/user-dashboard";
import { decodeSessionUser, userSessionCookie } from "@/lib/auth-session";
import { workspacePath } from "@/lib/workspace-path";
import { StaffOrganizationRequired } from "@/components/dashboard/staff-organization-required";

export const metadata: Metadata = {
  title: "Không gian nhân viên | LawScan",
  robots: { index: false, follow: false },
};

export default async function StaffPage() {
  const cookieStore = await cookies();
  const user = decodeSessionUser(cookieStore.get(userSessionCookie)?.value);
  if (!user) redirect("/dang-nhap");
  if (user.role !== "staff") redirect(workspacePath(user));
  if (!user.orgId) return <StaffOrganizationRequired email={user.email} />;
  return <UserDashboard staffMode />;
}
