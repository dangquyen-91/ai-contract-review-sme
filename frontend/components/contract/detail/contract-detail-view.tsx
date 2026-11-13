"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileWarning, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContractVersionsPanel } from "@/components/contract/contract-versions-panel";
import { ContractChat } from "@/components/review/results/contract-chat";
import { KeyTerms } from "@/components/review/results/key-terms";
import { ReviewWorkbench } from "@/components/review/results/review-results";
import { ShareSummaryDialog } from "@/components/review/sharing/share-summary-dialog";
import { ReviewProgressStrip } from "@/components/review/timeline/review-progress-strip";
import { routes } from "@/config/routes";
import { useContract, useContractKeyTerms, useContractVersions } from "@/hooks/contracts/use-contracts";
import { useContractDetailTab } from "@/hooks/contracts/use-contract-detail-tab";
import { activeRiskFindings } from "@/lib/review/verification-findings";
import { useDashboardReviewWorkflow } from "@/providers/review-workflow-provider";
import { ContractDetailHeader } from "./contract-detail-header";
import { ContractDetailTabs } from "./contract-detail-tabs";
import { ContractOverviewTab } from "./contract-overview-tab";
import { VersionMismatchNotice } from "./version-mismatch-notice";
import type { DashboardWorkspaceContext } from "@/components/layouts/dashboard/dashboard-shell";
import type { ContractReviewResult, ContractVersionSummary, DashboardContract } from "@/types/contracts";

const deletableRoles = ["administrator", "owner", "manager", "staff", "user"];

function idOf(contract?: DashboardContract) {
  return contract?.id ?? contract?._id;
}

function TermsPanel({ contractId }: { contractId: string }) {
  const terms = useContractKeyTerms(contractId);
  if (terms.isPending) return <p className="m-0 p-6 text-ui text-muted-foreground">Đang tải thông tin chính…</p>;
  if (!terms.data?.terms.length) return <p className="m-0 p-6 text-ui text-muted-foreground">AI chưa trích được thông tin chính cho loại hợp đồng này.</p>;
  return <KeyTerms contractId={contractId} />;
}

function NotReviewed({ contract, contractId, versions, canReview, busy, onStart }: {
  contract: DashboardContract;
  contractId: string;
  versions: ContractVersionSummary[];
  canReview: boolean;
  busy: boolean;
  onStart: () => void;
}) {
  const unsupported = contract.status === "unsupported";
  const current = versions.find((version) => version.isCurrent);
  const previous = versions.find((version) => !version.isCurrent && version.latestReview?.status === "completed");
  return (
    <section className="grid justify-items-center gap-3 rounded-[14px] border border-dashed border-[#cfd9e8] bg-white px-6 py-14 text-center">
      <span className={`grid size-12 place-items-center rounded-xl ${unsupported ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-600"}`}>
        {unsupported ? <FileWarning aria-hidden="true" className="size-6" /> : <Sparkles aria-hidden="true" className="size-6" />}
      </span>
      <h2 className="m-0 text-ui-card font-semibold">{unsupported ? "Chưa hỗ trợ rà soát tài liệu này" : previous && current ? `Phiên bản ${current.versionNumber} chưa được rà soát` : "Hợp đồng chưa được rà soát"}</h2>
      <p className="m-0 max-w-[480px] text-ui text-muted-foreground">
        {unsupported
          ? "Loại tài liệu này nằm ngoài các loại hợp đồng LawScan đang hỗ trợ. Tài liệu vẫn được lưu trong danh sách."
          : previous
            ? "Rà soát phiên bản mới để xem rủi ro và thay đổi so với bản trước. Kết quả của các phiên bản cũ vẫn được giữ."
            : "Cho AI tóm tắt, tìm điều khoản rủi ro và trích các thông tin chính của hợp đồng này."}
      </p>
      {!unsupported && canReview && (
        <Button size="sm" disabled={busy} onClick={onStart}>
          <Sparkles aria-hidden="true" />
          Bắt đầu rà soát
        </Button>
      )}
      {!unsupported && previous?.latestReview && (
        <Link href={routes.review(contractId, previous.latestReview.id)} className="text-ui-meta font-semibold text-primary hover:underline">
          Xem kết quả phiên bản {previous.versionNumber}
        </Link>
      )}
    </section>
  );
}

function ResultTabs({ result, contractId, role, canAsk, canUpload, versionCount }: {
  result: ContractReviewResult;
  contractId: string;
  role: string;
  canAsk: boolean;
  canUpload: boolean;
  versionCount?: number;
}) {
  const [tab, selectTab] = useContractDetailTab();
  return (
    <ContractDetailTabs
      tab={tab}
      onSelect={selectTab}
      counts={{ risks: activeRiskFindings(result.findings).length, versions: versionCount }}
      panels={{
        overview: () => <ContractOverviewTab result={result} role={role} onOpenRisks={() => selectTab("risks")} />,
        risks: () => (
          <div className="[container:review-result_/_inline-size]">
            <ReviewWorkbench result={result} showSummary={false} />
          </div>
        ),
        terms: () => <TermsPanel contractId={contractId} />,
        chat: () => <ContractChat key={contractId} contractId={contractId} canAsk={canAsk} />,
        versions: () => <ContractVersionsPanel contractId={contractId} embedded canUpload={canUpload} />,
      }}
    />
  );
}

export function ContractDetailView({ contractId, context }: { contractId: string; context: DashboardWorkspaceContext }) {
  const { data, access } = context;
  const {
    reviewResult, selectedContractId, stage, loadingResult, reconnecting, reviewing, isReviewing,
    reviewError, reviewBlocked, reviewProgress, retryKind, cancelling,
    reviewExisting, retryReview, cancelReview, reviewResultRef, reviewTimelineRef, setOpenContractPage,
  } = useDashboardReviewWorkflow();
  useEffect(() => {
    setOpenContractPage(contractId);
    return () => setOpenContractPage(null);
  }, [contractId, setOpenContractPage]);
  const contractQuery = useContract(contractId);
  const versionsQuery = useContractVersions(contractId);
  const [, selectTab] = useContractDetailTab();
  const [sharing, setSharing] = useState(false);
  const result = reviewResult && idOf(reviewResult.contract) === contractId ? reviewResult : null;
  const contract = result?.contract ?? contractQuery.data;
  const versions = versionsQuery.data ?? [];
  const tracking = selectedContractId === contractId;
  const running = tracking && (stage === "reviewing" || loadingResult || reconnecting);
  const loadingSaved = running && loadingResult && !reviewProgress;
  const failed = tracking && !result && Boolean(reviewError || reviewBlocked);
  const version = result?.contract.currentVersion;
  const shareEnabled = Boolean(result && version?.riskDetectionStatus === "completed" && version.summaryStatus === "completed");

  function review(rerun: boolean) {
    if (contract) void reviewExisting(contract, rerun);
  }

  let body;
  if (result && !running) {
    body = (
      <div ref={reviewResultRef} tabIndex={-1} className="scroll-mt-6 space-y-0 focus:outline-none">
        <ResultTabs key={contractId} result={result} contractId={contractId} role={data.role} canAsk={access.review} canUpload={access.upload} versionCount={versions.length || undefined} />
      </div>
    );
  } else if ((running && !loadingSaved) || failed) {
    body = (
      <div ref={reviewTimelineRef} className="scroll-mt-6">
        <ReviewProgressStrip
          role={data.role}
          blocked={reviewBlocked}
          review={reviewProgress}
          reviewing={reviewing}
          loadingResult={loadingResult}
          reconnecting={reconnecting}
          error={reviewError}
          failureKind={retryKind}
          onRetry={retryReview}
          onCancel={cancelReview}
          cancelling={cancelling}
        />
      </div>
    );
  } else if (!loadingSaved && contract && contract.status !== "reviewed" && contract.status !== "processing") {
    body = <NotReviewed contract={contract} contractId={contractId} versions={versions} canReview={access.review} busy={isReviewing} onStart={() => review(false)} />;
  } else if (contractQuery.isError) {
    body = (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-[14px] border border-red-200 bg-red-50 p-5 text-ui text-red-900">
        Không mở được hợp đồng này. Hợp đồng có thể đã bị xóa hoặc bạn không còn quyền truy cập.
        <Button size="sm" variant="outline" onClick={() => void contractQuery.refetch()}>Thử lại</Button>
      </div>
    );
  } else {
    body = (
      <div role="status" aria-label="Đang tải kết quả" className="h-[420px] animate-pulse rounded-[14px] border border-[#e4e8ef] bg-white motion-reduce:animate-none" />
    );
  }

  return (
    <div className="space-y-5">
      <ContractDetailHeader
        data={data}
        contractId={contractId}
        contract={contract}
        versions={versions}
        busy={isReviewing || running}
        canReview={access.review}
        canUpload={access.upload}
        canDelete={deletableRoles.includes(data.role)}
        shareEnabled={shareEnabled}
        onReview={review}
        onShare={() => setSharing(true)}
        onShowVersions={() => selectTab("versions")}
      />
      <VersionMismatchNotice contractId={contractId} versions={versions} canEdit={access.upload} />
      {body}
      {result && (
        <p className="m-0 text-right text-ui-meta text-[#8a94a3]">Kết quả do AI hỗ trợ, không thay thế ý kiến tư vấn pháp lý chuyên môn.</p>
      )}
      {sharing && result && (
        <ShareSummaryDialog key={`${contractId}:${result.contract.updatedAt}`} contractId={contractId} version={result.contract.updatedAt} onClose={() => setSharing(false)} />
      )}
    </div>
  );
}
