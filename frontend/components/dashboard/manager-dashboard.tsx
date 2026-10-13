"use client";

import { RecentContracts } from "./contracts/contract-list";
import { ManagerOverview } from "@/components/dashboard/overview/manager-overview";

import memberStyles from "./member/member-insights.module.css";
import styles from "./owner/owner-typography.module.css";

import { useOrganizationWorkflow } from "@/hooks/use-organization-workflow";
import { OrganizationWorkspace } from "./organization-workspace";
import { OrganizationUpload, UploadedReviewDialog, MemberContractList } from "./organization-review-panels";
export function ManagerDashboard() {
    const workspace = useOrganizationWorkflow("manager");
    const { activeTab, data, isFetching, dataUpdatedAt, access, selectTab, backToWork, reviewExisting, title, retryKind, reviewError, isReviewing, retryReview } = workspace;
    if (!data) return <OrganizationWorkspace role="manager" workspace={workspace}>{null}</OrganizationWorkspace>;
    const recentContracts = <RecentContracts memberMode={true} contracts={data.contracts.slice(0, 5)} canReview={access.review} onReview={reviewExisting} isReviewing={isReviewing} onViewAll={() => selectTab("contracts")}/>;
    return <>
    <OrganizationWorkspace role="manager" workspace={workspace} mainClassName={[activeTab === "upload" && styles.upload, activeTab === "contracts" && styles.contracts].filter(Boolean).join(" ")}>
          {<div className={memberStyles.freshness} role="status">{isFetching ? "Đang cập nhật dữ liệu…" : dataUpdatedAt ? "Cập nhật lúc " + new Date(dataUpdatedAt).toLocaleTimeString("vi-VN") : ""}{data.stats.processing > 0 && <span> · Tự cập nhật khi AI đang xử lý</span>}</div>}
          {activeTab === "upload" && <div className={memberStyles.reviewNavigation}><button type="button" onClick={backToWork}>← Quay lại danh sách</button><strong>{title || "Rà soát hợp đồng"}</strong></div>}
          {reviewError && activeTab === "upload" && <div className={memberStyles.errorBanner} role="alert"><p>{reviewError}</p><button type="button" onClick={retryReview} disabled={isReviewing}>{retryKind === "load" ? "Tải lại kết quả" : "Thử phân tích lại"}</button></div>}
          {activeTab === "overview" && (<ManagerOverview data={data} onUpload={() => selectTab("upload")} onViewContracts={(filter) => selectTab("contracts", filter)} onReview={reviewExisting} isReviewing={isReviewing}/>)}
          {activeTab === "overview" && recentContracts}
          {activeTab === "upload" && <>
            <OrganizationUpload workspace={workspace} />
            {recentContracts}
          </>}
          {activeTab === "contracts" && <MemberContractList workspace={workspace} managerMode />}
    </OrganizationWorkspace>
      <UploadedReviewDialog workspace={workspace} />
  </>;
}
