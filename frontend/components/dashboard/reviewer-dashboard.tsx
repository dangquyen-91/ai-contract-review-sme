"use client";

import { RecentContracts } from "./contracts/contract-list";
import { StaffOverview } from "@/components/dashboard/overview/staff-overview";

import memberStyles from "./member/member-insights.module.css";
import styles from "./owner/owner-typography.module.css";
import reviewerStyles from "./overview/staff-overview.module.css";
import { ReviewResults } from "@/components/contract/review-results";
import { Icon } from "@/components/ui/icon";

import { useOrganizationWorkflow } from "@/hooks/use-organization-workflow";
import { OrganizationWorkspace } from "./organization-workspace";
import { MemberContractList } from "./organization-review-panels";
export function ReviewerDashboard() {
    const workspace = useOrganizationWorkflow("reviewer");
    const { activeTab, data, isFetching, dataUpdatedAt, access, selectTab, backToWork, reviewExisting, title, reviewResult, reviewResultRef, pendingReviewId, retryKind, reviewError, isReviewing, retryReview } = workspace;
    if (!data) return <OrganizationWorkspace role="reviewer" workspace={workspace}>{null}</OrganizationWorkspace>;
    const recentContracts = <RecentContracts memberMode={true} contracts={data.contracts.slice(0, 5)} canReview={access.review} onReview={reviewExisting} isReviewing={isReviewing} onViewAll={() => selectTab("contracts")}/>;
    return <>
    <OrganizationWorkspace role="reviewer" workspace={workspace} mainClassName={[activeTab === "upload" && styles.upload, activeTab === "contracts" && styles.contracts].filter(Boolean).join(" ")}>
          {<div className={memberStyles.freshness} role="status">{isFetching ? "Đang cập nhật dữ liệu…" : dataUpdatedAt ? "Cập nhật lúc " + new Date(dataUpdatedAt).toLocaleTimeString("vi-VN") : ""}{data.stats.processing > 0 && <span> · Tự cập nhật khi AI đang xử lý</span>}</div>}
          {activeTab === "upload" && <div className={memberStyles.reviewNavigation}><button type="button" onClick={backToWork}>← Quay lại danh sách</button><strong>{title || "Rà soát hợp đồng"}</strong></div>}
          {reviewError && activeTab === "upload" && <div className={memberStyles.errorBanner} role="alert"><p>{reviewError}</p><button type="button" onClick={retryReview} disabled={isReviewing}>{retryKind === "load" ? "Tải lại kết quả" : "Thử phân tích lại"}</button></div>}
          {activeTab === "overview" && (<StaffOverview reviewerMode data={data} onUpload={() => selectTab("contracts")} onViewContracts={(filter) => selectTab("contracts", filter)} onReview={reviewExisting} isReviewing={isReviewing}/>)}
          {activeTab === "overview" && recentContracts}
          {activeTab === "upload" && <>
            <section className={reviewerStyles.workbench} aria-labelledby="reviewer-workbench-heading">
              <span className={reviewerStyles.eyebrow}>Không gian rà soát</span>
              <h1 id="reviewer-workbench-heading">{title || "Kiểm tra hợp đồng"}</h1>
              <p>Đọc kết quả phân tích, kiểm tra căn cứ pháp lý và hoàn thiện đề xuất chỉnh sửa.</p>
              <div className={reviewerStyles.reviewStatus} role="status" aria-live="polite">
                <Icon name={pendingReviewId ? "shield" : "document"}/>
                <span>{isReviewing ? "Đang tải và phân tích hợp đồng…" : pendingReviewId ? "Chưa thể hoàn tất rà soát. Bạn có thể thử lại." : reviewResult ? "Kết quả AI đã sẵn sàng để kiểm tra." : "Chọn một hợp đồng bên dưới để bắt đầu."}</span>
              </div>
              <div className={reviewerStyles.heroActions}>
                <button type="button" className={reviewerStyles.secondaryAction} onClick={() => selectTab("contracts")}>Chọn hợp đồng <Icon name="arrow" className={reviewerStyles.actionIcon}/></button>
              </div>
            </section>
            {reviewResult && <div ref={reviewResultRef} key={reviewResult.contract.id ?? reviewResult.contract._id}><ReviewResults result={reviewResult} canAsk showAiContext/></div>}
            {recentContracts}
          </>}
          {activeTab === "contracts" && <MemberContractList workspace={workspace} reviewerMode />}
    </OrganizationWorkspace>
  </>;
}
