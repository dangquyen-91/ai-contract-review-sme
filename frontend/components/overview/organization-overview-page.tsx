"use client";

import { useOrganizationDashboard } from "@/providers/dashboard-provider";
import { RecentContractList } from "@/components/contract/recent-contract-list";
import { OwnerOverview } from "@/components/overview/owner-overview";
import { StaffOverview } from "@/components/overview/staff-overview";

export function OrganizationOverviewPage() {
  const { data, selectTab, reviewExisting, isReviewing, selectFile } = useOrganizationDashboard();
  if (!data) return null;
  if (data.role === "owner") return <OwnerOverview data={data} onUpload={() => selectTab("upload")} onMembers={() => selectTab("members")} />;
  const onViewContracts = (filter = {}) => selectTab("contracts", filter);
  return <>
    <StaffOverview expertMode={false} data={data} onUpload={() => selectTab("upload")} onViewContracts={onViewContracts} onReview={reviewExisting} onQuickUpload={async (file) => { if (await selectFile(file)) selectTab("upload"); }} isReviewing={isReviewing} />
    <div className="mt-5"><RecentContractList contracts={data.contracts.slice(0, 5)} /></div>
  </>;
}
