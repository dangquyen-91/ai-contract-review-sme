"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DashboardShell } from "./dashboard-shell";
import { routes } from "@/config/routes";

export function ManagementDashboardShell({ name, children }: { name: string; children: ReactNode }) {
  const pathname = usePathname();
  const legalSources = pathname.startsWith(routes.legalSources);
  const overview = pathname === "/management";
  const reports = pathname === "/management/reports";
  return <DashboardShell role="manager" activeKey={reports ? "reports" : overview ? "overview" : legalSources ? "legal-sources" : "organizations"}
    sectionLabel={reports ? "Báo cáo kho pháp lý" : overview ? "Tổng quan" : legalSources ? "Kho pháp lý" : "Tổ chức"} workspaceName="LawScan"
    workspaceLabel="Không gian quản lý hệ thống" name={name} roleLabel="Quản lý hệ thống">{children}</DashboardShell>;
}
