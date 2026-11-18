import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/access";
import { requireSession } from "@/lib/auth/session";
import { ReportsOverview } from "@/components/reports/reports-overview";
import { RoleInsights } from "@/components/overview/role-insights";

export const metadata: Metadata = {
  title: "Báo cáo công việc | LawScan",
  robots: { index: false, follow: false },
};

export default async function OrganizationReportsPage() {
  // Saved links from personal accounts land on their overview, which has the same figures.
  if ((await requireSession()).user.role === "user") redirect("/dashboard");
  const { user } = await requirePermission("reports");
  if (user.role === "owner")
    return (
      <ReportsOverview organizationOnly scopeId={user.orgId ?? undefined} />
    );
  return (
    <RoleInsights
      role="staff"
      scopeId={user.orgId ?? undefined}
      heading
      reportPage
    />
  );
}
