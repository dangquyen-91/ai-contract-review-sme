import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/access";
import { RoleInsights } from "@/components/overview/role-insights";

export const metadata: Metadata = {
  title: "Báo cáo kho pháp lý | LawScan",
  robots: { index: false, follow: false },
};

export default async function ManagementReportsPage() {
  await requirePermission("management");
  return <RoleInsights role="manager" heading reportPage />;
}
