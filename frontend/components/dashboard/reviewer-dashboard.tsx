"use client";

import { OrganizationDashboard, type OrganizationDashboardActions } from "@/components/dashboard/organization-dashboard";
import { StaffOverview } from "@/components/dashboard/staff-overview";

function ReviewerDashboardOverview({ data, onViewContracts, onReview, isReviewing }: OrganizationDashboardActions) {
  return <StaffOverview reviewerMode data={data} onUpload={() => onViewContracts()} onViewContracts={(filter) => onViewContracts(filter)} onReview={onReview} isReviewing={isReviewing} />;
}

export function ReviewerDashboard() {
  return <OrganizationDashboard role="reviewer" Overview={ReviewerDashboardOverview} />;
}
