import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardAccessLayout } from "@/components/layouts/dashboard/dashboard-access-layout";

export const metadata: Metadata = { title: "Hợp đồng của tôi | LawScan", robots: { index: false, follow: false } };

export default function UserLayout({ children }: { children: ReactNode }) {
  return <DashboardAccessLayout role="user">{children}</DashboardAccessLayout>;
}
