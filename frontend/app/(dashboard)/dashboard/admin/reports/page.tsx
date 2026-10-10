import type { Metadata } from "next";
import { ReportsOverview } from "@/components/admin/reports-overview";

export const metadata: Metadata = {
  title: "Báo cáo & thống kê | LawScan",
  robots: { index: false, follow: false },
};

export default function AdminReportsPage() {
  return <ReportsOverview />;
}
