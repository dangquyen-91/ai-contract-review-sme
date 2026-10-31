import type { ReactNode } from "react";
import { requirePermission } from "@/lib/auth/access";
import { DashboardAccessLayout } from "@/components/layouts/dashboard/dashboard-access-layout";
import { redirect } from "next/navigation";
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = await requirePermission("contracts");
  if (user.role === "expert") redirect("/expert-verification/overview");
  return <DashboardAccessLayout role={user.role as "user" | "owner" | "staff" | "expert" | "manager"}>{children}</DashboardAccessLayout>;
}
