"use client";

import { useOrganizationDashboard } from "@/providers/dashboard-provider";
import { RecentContracts } from "@/components/contract/recent-contracts";
import { OwnerOverview } from "@/components/overview/owner-overview";
import { ManagerOverview } from "@/components/overview/manager-overview";
import { StaffOverview } from "@/components/overview/staff-overview";

export function OrganizationOverviewPage() {
  const { data, access, selectTab, reviewExisting, isReviewing, selectFile } = useOrganizationDashboard();
  if (!data) return null;
  if (data.role === "owner") return <OwnerOverview data={data} onUpload={() => selectTab("upload")} onViewContracts={() => selectTab("contracts")} onMembers={() => selectTab("members")} onReview={reviewExisting} isReviewing={isReviewing} />;
  const reviewerMode = data.role === "reviewer";
  const onViewContracts = (filter = {}) => selectTab("contracts", filter);
  return <>
    {data.role === "manager"
      ? <ManagerOverview data={data} onUpload={() => selectTab("upload")} onViewContracts={onViewContracts} onReview={reviewExisting} isReviewing={isReviewing} />
      : <StaffOverview reviewerMode={reviewerMode} data={data} onUpload={() => selectTab(reviewerMode ? "contracts" : "upload")} onViewContracts={onViewContracts} onReview={reviewExisting} onQuickUpload={reviewerMode ? undefined : async (file) => { if (await selectFile(file)) selectTab("upload"); }} isReviewing={isReviewing} />}
    <RecentContracts contracts={data.contracts.slice(0, 5)} canReview={access.review} onReview={reviewExisting} isReviewing={isReviewing} onViewAll={() => selectTab("contracts")} />
  </>;
}
