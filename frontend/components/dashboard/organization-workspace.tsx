"use client";

import type { ReactNode } from "react";
import type { DashboardRole } from "@/config/dashboard-roles";
import type { OrganizationWorkflow, DashboardTab } from "@/hooks/use-organization-workflow";
import { DashboardShell } from "@/components/layouts/dashboard/dashboard-shell";
import { DashboardError } from "./dashboard-error";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { getDashboardNavigation } from "@/config/dashboard-navigation";
import styles from "./owner/owner-typography.module.css";

export function OrganizationWorkspace({ role, workspace, mainClassName, children }: {
  role: DashboardRole;
  workspace: OrganizationWorkflow;
  mainClassName?: string;
  children: ReactNode;
}) {
  const { data, error, isLoading, refetch, activeTab, roleLabel, selectTab } = workspace;
  if (isLoading) return <DashboardSkeleton />;
  if (error || !data) return <DashboardError error={error} onRetry={() => refetch()} />;
  return (
      <DashboardShell
        role={role}
        activeKey={activeTab}
        sectionLabel={getDashboardNavigation(role).find((item) => item.key === activeTab)?.label ?? activeTab}
        workspaceName={data.organization.name}
        workspaceLabel="Không gian làm việc"
        name={data.user?.name ?? "Tài khoản LawScan"}
        roleLabel={roleLabel}
        onNavigate={(key) => selectTab(key as DashboardTab)}
        contractCount={data.totalContracts}
        className={styles.shell}
        mainClassName={mainClassName}
      >
    {children}
      </DashboardShell>
  );
}
