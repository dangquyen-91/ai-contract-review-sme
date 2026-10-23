import { requirePermission } from "@/lib/auth/access";
import type { Metadata } from "next";
import { ReportsOverview } from "@/components/reports/reports-overview";

export const metadata: Metadata = {
  title: "Báo cáo & thống kê | LawScan",
  robots: { index: false, follow: false },
};

export default async function AdminReportsPage() {
  await requirePermission("admin");
  return <ReportsOverview />;
}
