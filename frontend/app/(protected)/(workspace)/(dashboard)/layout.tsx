import type { ReactNode } from "react";
import { requirePermission } from "@/lib/auth/access";
import { DashboardAccessLayout } from "@/components/layouts/dashboard/dashboard-access-layout";
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = await requirePermission("contracts");
  return <DashboardAccessLayout role={user.role as "user" | "owner" | "staff" | "expert" | "manager"}>{children}</DashboardAccessLayout>;
}
