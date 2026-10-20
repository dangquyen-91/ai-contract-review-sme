import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardAccessLayout } from "@/components/layouts/dashboard/dashboard-access-layout";

export const metadata: Metadata = { title: "Dashboard owner | LawScan", robots: { index: false, follow: false } };

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return <DashboardAccessLayout role="owner">{children}</DashboardAccessLayout>;
}
