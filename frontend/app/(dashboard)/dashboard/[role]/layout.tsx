import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { DashboardAccessLayout } from "@/components/layouts/dashboard/dashboard-access-layout";
import { isOrganizationDashboardRole } from "@/lib/organization-dashboard-route";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function RoleLayout({ children, params }: {
  children: ReactNode;
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (role !== "user" && !isOrganizationDashboardRole(role)) notFound();

  return <DashboardAccessLayout role={role}>{children}</DashboardAccessLayout>;
}
