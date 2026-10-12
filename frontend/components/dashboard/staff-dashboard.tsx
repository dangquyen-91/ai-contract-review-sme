"use client";

import { OrganizationDashboard, type OrganizationDashboardActions } from "@/components/dashboard/organization-dashboard";
import { StaffOverview } from "@/components/dashboard/staff-overview";

function StaffDashboardOverview({ data, onUpload, onViewContracts, onReview, onQuickUpload, isReviewing }: OrganizationDashboardActions) {
  return <StaffOverview data={data} onQuickUpload={onQuickUpload} onUpload={onUpload} onViewContracts={(filter) => onViewContracts(filter)} onReview={onReview} isReviewing={isReviewing} />;
}

export function StaffDashboard() {
  return <OrganizationDashboard role="staff" Overview={StaffDashboardOverview} />;
}
