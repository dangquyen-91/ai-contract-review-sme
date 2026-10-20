import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { DashboardAccessLayout } from "@/components/layouts/dashboard/dashboard-access-layout";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function RoleLayout({ children, params }: {
  children: ReactNode;
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (role !== "owner" && role !== "user" && role !== "staff") notFound();

  return <DashboardAccessLayout role={role}>{children}</DashboardAccessLayout>;
}
