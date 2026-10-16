"use client";

import { ContractContent } from "@/components/contract/contract-content";
import { DashboardShell } from "@/components/layouts/dashboard/dashboard-shell";
import { useOptionalOrganizationDashboard } from "@/providers/dashboard-provider";

export function ContractDashboardPage() {
  const workspace = useOptionalOrganizationDashboard();
  if (workspace) {
    const { data, access, roleLabel, reviewExisting, isReviewing } = workspace;
    if (!data) return null;
    return <ContractContent data={data} access={access} roleLabel={roleLabel} onReview={reviewExisting} isReviewing={isReviewing} />;
  }
  return <DashboardShell view="contract">{(context) => <ContractContent {...context} />}</DashboardShell>;
}
