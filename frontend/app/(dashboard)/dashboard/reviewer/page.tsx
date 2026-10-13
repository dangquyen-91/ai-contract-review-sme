import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ReviewerDashboard } from "@/components/dashboard/reviewer-dashboard";
import { StaffOrganizationRequired } from "@/components/dashboard/overview/staff-organization-required";
import { decodeSessionUser, userSessionCookie } from "@/lib/auth-session";
import { workspacePath } from "@/lib/workspace-path";

export const metadata: Metadata = {
  title: "Không gian chuyên viên rà soát | LawScan",
  robots: { index: false, follow: false },
};

export default async function ReviewerPage() {
  const cookieStore = await cookies();
  const user = decodeSessionUser(cookieStore.get(userSessionCookie)?.value);
  if (!user) redirect("/dang-nhap");
  if (user.role !== "reviewer") redirect(workspacePath(user));
  if (!user.orgId) return <StaffOrganizationRequired email={user.email} role="reviewer" />;
  return <ReviewerDashboard />;
}
