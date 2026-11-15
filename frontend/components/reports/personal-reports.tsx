"use client";

import { DashboardShell } from "@/components/layouts/dashboard/dashboard-shell";
import { RoleInsights } from "@/components/overview/role-insights";

export function PersonalReports({ accountId }: { accountId: string }) {
  return (
    <DashboardShell view="reports">
      {() => (
        <RoleInsights role="user" scopeId={accountId} heading reportPage />
      )}
    </DashboardShell>
  );
}
