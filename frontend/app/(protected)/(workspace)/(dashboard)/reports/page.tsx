import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/access";
import { ReportsOverview } from "@/components/reports/reports-overview";

export const metadata: Metadata = {
  title: "Báo cáo tổ chức | LawScan",
  robots: { index: false, follow: false },
};

export default async function OrganizationReportsPage() {
  await requirePermission("members");
  return <ReportsOverview organizationOnly />;
}
