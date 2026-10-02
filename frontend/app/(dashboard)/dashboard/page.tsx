import type { Metadata } from "next";
import { OwnerDashboard } from "@/components/dashboard/owner-dashboard";

export const metadata: Metadata = {
  title: "Dashboard owner | LawScan",
  description: "Tổng quan hợp đồng và quản trị tổ chức trên LawScan.",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return <OwnerDashboard />;
}
