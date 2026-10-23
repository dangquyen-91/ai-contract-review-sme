"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DashboardShell } from "./dashboard-shell";
import { routes } from "@/config/routes";

export function ManagementDashboardShell({ name, children }: { name: string; children: ReactNode }) {
  const pathname = usePathname();
  const legalSources = pathname.startsWith(routes.legalSources);
  return <DashboardShell role="manager" activeKey={legalSources ? "legal-sources" : "organizations"}
    sectionLabel={legalSources ? "Kho pháp lý" : "Tổ chức"} workspaceName="LawScan"
    workspaceLabel="Không gian quản lý" name={name} roleLabel="Quản lý">{children}</DashboardShell>;
}
