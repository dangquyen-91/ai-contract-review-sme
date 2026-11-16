"use client";

import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layouts/dashboard/dashboard-shell";
import { roleLabels } from "@/config/dashboard-roles";
import type { AuthUser } from "@/types/auth";

export function StudioShell({
  user,
  organizationName,
  blockNavigation = false,
  children,
}: {
  user: AuthUser;
  organizationName?: string;
  blockNavigation?: boolean;
  children: ReactNode;
}) {
  return (
    <DashboardShell
      role={user.role}
      activeKey="drafts"
      sectionLabel="Soạn hợp đồng"
      workspaceName={organizationName ?? (user.role === "user" ? user.name : "Doanh nghiệp")}
      workspaceLabel={user.role === "user" ? "Không gian cá nhân" : "Không gian doanh nghiệp"}
      name={user.name}
      roleLabel={roleLabels[user.role]}
      homeHref="/dashboard"
      layout="editor"
      blockNavigation={blockNavigation}
    >
      {children}
    </DashboardShell>
  );
}
