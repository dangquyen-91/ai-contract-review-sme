"use client";

import { ContractContent } from "@/components/contract/contract-content";
import { DashboardShell } from "@/components/layouts/dashboard/dashboard-shell";

export function ContractDashboardPage() {
  return <DashboardShell view="contract">{(context) => <ContractContent {...context} />}</DashboardShell>;
}
