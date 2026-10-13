import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardAccessLayout } from "@/components/layouts/dashboard/dashboard-access-layout";

export const metadata: Metadata = { title: "Không gian nhân viên | LawScan", robots: { index: false, follow: false } };

export default function StaffLayout({ children }: { children: ReactNode }) {
  return <DashboardAccessLayout role="staff">{children}</DashboardAccessLayout>;
}
