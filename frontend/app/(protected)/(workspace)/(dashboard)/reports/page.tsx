import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/access";
import { ReportsOverview } from "@/components/reports/reports-overview";
import { RoleInsights } from "@/components/overview/role-insights";
import { PersonalReports } from "@/components/reports/personal-reports";

export const metadata: Metadata = {
  title: "Báo cáo công việc | LawScan",
  robots: { index: false, follow: false },
};

export default async function OrganizationReportsPage() {
  const { user } = await requirePermission("reports");
  if (user.role === "user") return <PersonalReports accountId={user.id} />;
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
