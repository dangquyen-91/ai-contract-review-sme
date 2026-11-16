"use client";

import { DashboardShell } from "@/components/layouts/dashboard/dashboard-shell";
import { RecentContractList } from "@/components/contract/recent-contract-list";
import { RoleInsights } from "./role-insights";
import { AccountAllowance } from "./account-allowance";

export function PersonalOverview({ accountId }: { accountId: string }) {
  return (
    <DashboardShell view="overview">
      {({ data }) => (
        <div className="grid min-w-0 gap-6">
          <RoleInsights role="user" scopeId={accountId} heading />
          <AccountAllowance accountId={accountId} personal />
          <RecentContractList contracts={data.contracts.slice(0, 5)} />
        </div>
      )}
    </DashboardShell>
  );
}
