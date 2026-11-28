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
  const templates = pathname.startsWith("/management/contract-templates");
  const payments = pathname.startsWith("/management/payments");
  return <DashboardShell role="manager" activeKey={templates ? "contract-templates" : payments ? "payments" : reports ? "reports" : overview ? "overview" : legalSources ? "legal-sources" : "organizations"}
    sectionLabel={templates ? "Mẫu hợp đồng" : payments ? "Lịch sử giao dịch" : reports ? "Báo cáo kho pháp lý" : overview ? "Tổng quan" : legalSources ? "Kho pháp lý" : "Tổ chức"} workspaceName="LawScan"
    workspaceLabel="Không gian quản lý hệ thống" name={name} roleLabel="Quản lý hệ thống">{children}</DashboardShell>;
}
