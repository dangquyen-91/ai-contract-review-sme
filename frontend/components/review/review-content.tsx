"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { AnalysisFocusDialog } from "@/components/contract/analysis-focus-dialog";
import { ReviewUploadWorkspace } from "@/components/review/review-upload-workspace";
import { businessTypeLabels } from "@/config/contract-display";
import { useReviewWorkflow, reviewErrorMessage } from "@/hooks/use-review-workflow";
import { contractsApi } from "@/lib/api/contracts";
import type { DashboardWorkspaceContext } from "@/components/layouts/dashboard/dashboard-shell";


const personalTypeLabels: Record<string, string> = {
  life_insurance: "Hợp đồng bảo hiểm nhân thọ",
  housing_purchase: "Hợp đồng mua bán bất động sản",
  labor: "Hợp đồng lao động",
};

export function ReviewContent({ data, access, roleLabel }: DashboardWorkspaceContext) {
  const searchParams = useSearchParams();
  const { file, title, setTitle, contractType, setContractType, ourParty, setOurParty, industry, setIndustry, uploadedContract, setUploadedContract, reviewResult, reviewProgress, reviewResultRef, pendingReviewId, stage, selectedProfile, selectFile, reviewUploadedContract, reviewExisting, retryReview } = useReviewWorkflow({ access, initialType: data.role === "user" ? "life_insurance" : "service", personal: data.role === "user" });
  const openedReviewRequest = useRef<string | null>(null);
  const availableTypeLabels = data.role === "user" ? personalTypeLabels : businessTypeLabels;
  useEffect(() => {
    const contractId = searchParams.get("contract");
    if (!contractId || !data || openedReviewRequest.current === contractId) return;
    openedReviewRequest.current = contractId;
    void (async () => {
      try {
        const contract = data.contracts.find((item) => (item.id ?? item._id) === contractId)
          ?? await contractsApi.getContract(contractId);
        await reviewExisting(contract, searchParams.get("rerun") === "1");
      } catch (requestError) {
        toast.error("Chưa thể mở hợp đồng", { description: reviewErrorMessage(requestError) });
      }
    })();
  }, [data, searchParams, reviewExisting]);

  return <>
    <ReviewUploadWorkspace personal={data.role === "user"} access={access} roleLabel={roleLabel} formProps={{ file, title, contractType, typeLabels: availableTypeLabels, profile: selectedProfile, ourParty, fixedOurParty: data.role === "user" && contractType === "labor" ? "employee" : undefined, industry, isUploading: stage === "uploading", onFileChange: selectFile, onTitleChange: setTitle, onContractTypeChange: (value) => { setContractType(value); setOurParty(""); }, onOurPartyChange: setOurParty, onIndustryChange: setIndustry }} stage={stage} reviewProgress={reviewProgress} pendingReviewId={pendingReviewId} showInlineRetry onRetry={retryReview} reviewResult={reviewResult} resultRef={reviewResultRef} canAsk={data.role !== "user"} showAiContext={data.role !== "user"} />
    {uploadedContract && <AnalysisFocusDialog key={uploadedContract.id} contractTitle={uploadedContract.title} isReviewing={stage === "reviewing"} onDismiss={() => { setUploadedContract(null); toast.success("Đã tải hợp đồng lên"); }} onReview={reviewUploadedContract} />}
  </>;
}

