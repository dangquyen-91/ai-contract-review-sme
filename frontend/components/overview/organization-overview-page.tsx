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
  const expertMode = data.role === "expert";
  const onViewContracts = (filter = {}) => selectTab("contracts", filter);
  return <>
    {data.role === "manager"
      ? <ManagerOverview data={data} onUpload={() => selectTab("upload")} onViewContracts={onViewContracts} onReview={reviewExisting} isReviewing={isReviewing} />
      : <StaffOverview expertMode={expertMode} data={data} onUpload={() => selectTab(expertMode ? "contracts" : "upload")} onViewContracts={onViewContracts} onReview={reviewExisting} onQuickUpload={expertMode ? undefined : async (file) => { if (await selectFile(file)) selectTab("upload"); }} isReviewing={isReviewing} />}
    <RecentContracts contracts={data.contracts.slice(0, 5)} canReview={access.review} onReview={reviewExisting} isReviewing={isReviewing} onViewAll={() => selectTab("contracts")} />
  </>;
}
