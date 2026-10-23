import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardAccessLayout } from "@/components/layouts/dashboard/dashboard-access-layout";

export const metadata: Metadata = { title: "Không gian chuyên gia | LawScan", robots: { index: false, follow: false } };

export default function ExpertLayout({ children }: { children: ReactNode }) {
  return <DashboardAccessLayout role="expert">{children}</DashboardAccessLayout>;
}
