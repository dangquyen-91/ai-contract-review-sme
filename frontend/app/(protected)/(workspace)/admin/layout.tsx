import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/access";
import { SystemDashboardShell } from "@/components/layouts/dashboard/system-dashboard-shell";

export const metadata: Metadata = {
  title: "Quản trị hệ thống | LawScan",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requirePermission("admin");
  return <SystemDashboardShell name={user.name}>{children}</SystemDashboardShell>;
}
