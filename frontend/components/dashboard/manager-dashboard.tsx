"use client";

import { ManagerOverview } from "@/components/dashboard/manager-overview";
import { OrganizationDashboard, type OrganizationDashboardActions } from "@/components/dashboard/organization-dashboard";

function ManagerDashboardOverview({ data, onUpload, onViewContracts, onReview, isReviewing }: OrganizationDashboardActions) {
  return <ManagerOverview data={data} onUpload={onUpload} onViewContracts={(filter) => onViewContracts(filter)} onReview={onReview} isReviewing={isReviewing} />;
}

export function ManagerDashboard() {
  return <OrganizationDashboard role="manager" Overview={ManagerDashboardOverview} />;
}
