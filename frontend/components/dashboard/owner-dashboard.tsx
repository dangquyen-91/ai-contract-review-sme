"use client";

import { AdministrationView } from "./owner/administration-view";
import { ContractsView, RecentContracts } from "./contracts/contract-list";
import { OwnerMembersView } from "@/components/dashboard/owner/owner-members-view";
import { OwnerOverview } from "@/components/dashboard/owner/owner-overview";
import memberStyles from "./member/member-insights.module.css";
import styles from "./owner/owner-typography.module.css";

import { useOrganizationWorkflow } from "@/hooks/use-organization-workflow";
import { OrganizationWorkspace } from "./organization-workspace";
import { OrganizationUpload, UploadedReviewDialog } from "./organization-review-panels";
export function OwnerDashboard() {
    const workspace = useOrganizationWorkflow("owner");
    const { activeTab, data, access, roleLabel, selectTab, reviewExisting, retryKind, reviewError, isReviewing, retryReview } = workspace;
    if (!data) return <OrganizationWorkspace role="owner" workspace={workspace}>{null}</OrganizationWorkspace>;
    const recentContracts = <RecentContracts memberMode={false} contracts={data.contracts.slice(0, 5)} canReview={access.review} onReview={reviewExisting} isReviewing={isReviewing} onViewAll={() => selectTab("contracts")}/>;
    return <>
    <OrganizationWorkspace role="owner" workspace={workspace} mainClassName={[activeTab === "overview" && styles.overview, activeTab === "upload" && styles.upload, activeTab === "contracts" && styles.contracts, activeTab === "administration" && styles.administration, activeTab === "members" && styles.members].filter(Boolean).join(" ")}>
          {reviewError && activeTab === "upload" && <div className={memberStyles.errorBanner} role="alert"><p>{reviewError}</p><button type="button" onClick={retryReview} disabled={isReviewing}>{retryKind === "load" ? "Tải lại kết quả" : "Thử phân tích lại"}</button></div>}
          {activeTab === "overview" && (<OwnerOverview data={data} onUpload={() => selectTab("upload")} onViewContracts={() => selectTab("contracts")} onMembers={() => selectTab("members")} onReview={reviewExisting} isReviewing={isReviewing}/>)}
          {activeTab === "upload" && <>
            <OrganizationUpload workspace={workspace} showInlineRetry showAiContext={false} />
            {recentContracts}
          </>}
          {activeTab === "contracts" && <ContractsView contracts={data.contracts} canReview={access.review} onReview={reviewExisting} isReviewing={isReviewing}/>}
          {activeTab === "administration" && access.administer && <AdministrationView organization={data.organization} roleLabel={roleLabel} onMembers={() => selectTab("members")}/>}
          {activeTab === "members" && data.role === "owner" && <OwnerMembersView orgId={data.organization.id} organizationName={data.organization.name}/>}
    </OrganizationWorkspace>
      <UploadedReviewDialog workspace={workspace} />
  </>;
}
