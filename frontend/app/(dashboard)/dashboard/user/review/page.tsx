"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ReviewLayout } from "@/components/contract/review-layout";
import { ReviewTimeline } from "@/components/contract/review-timeline";
import { AnalysisFocusDialog } from "@/components/contract/analysis-focus-dialog";
import { ContractUploadForm } from "@/components/contract/contract-upload-form";
import { ReviewResults } from "@/components/contract/review-results";
import { Icon } from "@/components/ui/icon";
import { useGetContractReviewMutation, useReviewContractMutation, useUploadContractMutation } from "@/hooks/use-contracts";
import { isApiClientError } from "@/lib/api/client";
import { contractsApi } from "@/lib/api/contracts";
import { reviewProgressLabel } from "@/lib/review-progress";
import { isReviewCancelled, readReviewSession } from "@/lib/review-session";
import type { ContractReviewResult, ContractReviewRun, DashboardContract } from "@/types/contracts";
import { UserDashboardShell, type UserDashboardContext } from "@/components/dashboard/user-dashboard-shell";

type ReviewStage = "idle" | "uploading" | "reviewing" | "done";

const typeLabels: Record<string, string> = {
  sales: "Mua bán hàng hóa", service: "Cung ứng dịch vụ",
  labor: "Hợp đồng lao động", office_lease: "Thuê văn phòng", housing_purchase: "Mua bán nhà ở", life_insurance: "Bảo hiểm nhân thọ",
};

function reviewErrorMessage(error: unknown) {
  if (isApiClientError(error) && error.status === 409) {
    return "Hợp đồng đang được phân tích ở một phiên khác. Vui lòng thử lại sau khi quá trình đó hoàn tất.";
  }
  return error instanceof Error ? error.message : "Vui lòng thử lại sau.";
}

export default function ReviewPage() { return <UserDashboardShell view="review">{(context) => <ReviewContent {...context} />}</UserDashboardShell>; }

function ReviewContent({ data, access, roleLabel }: UserDashboardContext) {
  const searchParams = useSearchParams();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [contractType, setContractType] = useState<DashboardContract["type"]>("service");
  const [ourParty, setOurParty] = useState("");
  const [industry, setIndustry] = useState("");
  const [uploadedContract, setUploadedContract] = useState<{ id: string; title: string } | null>(null);
  const [workflowComplete, setWorkflowComplete] = useState(false);
  const [reviewResult, setReviewResult] = useState<ContractReviewResult | null>(null);
  const [reviewProgress, setReviewProgress] = useState<ContractReviewRun | null>(null);
  const reviewResultRef = useRef<HTMLDivElement>(null);
  const [pendingReviewId, setPendingReviewId] = useState<string | null>(null);
  const [pendingReviewFocus, setPendingReviewFocus] = useState("");
  const [retryKind, setRetryKind] = useState<"load" | "run">("run");
  const openedReviewRequest = useRef<string | null>(null);
  const uploadContractMutation = useUploadContractMutation();
  const reviewContractMutation = useReviewContractMutation();
  const getContractReviewMutation = useGetContractReviewMutation();
  const stage: ReviewStage = uploadContractMutation.isPending
    ? "uploading"
    : reviewContractMutation.isPending
      ? "reviewing"
      : workflowComplete
        ? "done"
        : "idle";
  const timelineError = pendingReviewId && !reviewContractMutation.isPending && !getContractReviewMutation.isPending
    ? (getContractReviewMutation.error ?? reviewContractMutation.error)?.message || "Chưa cập nhật được lượt rà soát. Hãy thử lại."
    : undefined;
  const { data: profiles } = useQuery({ queryKey: ["contract-profiles"], queryFn: contractsApi.listProfiles, staleTime: 5 * 60_000 });
  const availableTypeLabels = profiles?.length ? Object.fromEntries(profiles.map((profile) => [profile.code, profile.name])) : typeLabels;
  const selectedProfile = profiles?.find((profile) => profile.code === contractType);

  useEffect(() => {
    if (reviewResult) reviewResultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [reviewResult]);

  async function selectFile(nextFile?: File) {
    if (!nextFile || !access.upload || uploadContractMutation.isPending || reviewContractMutation.isPending) return;
    const validTypes = new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg"]);
    if (!validTypes.has(nextFile.type)) {
      toast.error("Định dạng chưa được hỗ trợ", { description: "Vui lòng chọn PDF, DOCX, PNG hoặc JPG." });
      return;
    }
    if (nextFile.size > 20 * 1024 * 1024) { toast.error("Tệp vượt quá 20 MB"); return; }
    const uploadTitle = title.trim() || nextFile.name.replace(/\.[^.]+$/, "").trim() || "Hợp đồng mới";
    if (uploadTitle.length < 2) { toast.error("Tên hợp đồng phải có ít nhất 2 ký tự"); return; }
    setFile(nextFile);
    setTitle(uploadTitle);
    setReviewResult(null);
    setReviewProgress(null);
    setPendingReviewId(null);
    setPendingReviewFocus("");
    setWorkflowComplete(false);
    const formData = new FormData();
    formData.set("file", nextFile); formData.set("title", uploadTitle); formData.set("type", contractType);
    if (ourParty) formData.set("ourParty", ourParty);
    if (industry) formData.set("industry", industry);
    try {
      const contract = await uploadContractMutation.mutateAsync(formData);
      const contractId = contract.id ?? contract._id;
      setFile(null);
      setTitle("");
      if (access.review && contractId) setUploadedContract({ id: contractId, title: contract.title });
      else toast.success("Đã tải hợp đồng lên");
    } catch (requestError) {
      toast.error("Chưa thể tải hợp đồng lên", { description: reviewErrorMessage(requestError) });
    }
  }

  async function runReview(contractId: string, focus = "", resumeOnly = false) {
    setRetryKind("run");
    openedReviewRequest.current = contractId;
    window.history.replaceState(null, "", `/dashboard/user/review?${new URLSearchParams({ contract: contractId, reviewMode: "resume" })}`);
    setReviewProgress(null);
    const result = await reviewContractMutation.mutateAsync({
      contractId,
      analysisFocus: focus.trim() || undefined,
      onProgress: (review) => {
        setReviewProgress(review);
        if (review.status === "completed") setRetryKind("load");
      },
      resumeOnly,
    });
    setReviewResult(result);
    setPendingReviewId(null);
    setPendingReviewFocus("");
    setWorkflowComplete(true);
    toast.success("AI đã hoàn tất rà soát", { description: `Đã phát hiện ${result.findings.length} điểm cần lưu ý.` });
  }

  async function reviewUploadedContract(focus: string) {
    if (!uploadedContract) return;
    const contractId = uploadedContract.id;
    setUploadedContract(null);
    try { await runReview(contractId, focus); }
    catch (requestError) {
      if (isReviewCancelled(requestError)) return;
      setPendingReviewId(contractId);
      setPendingReviewFocus(focus);
      toast.error("Đã tải lên, nhưng AI chưa hoàn tất", { description: reviewErrorMessage(requestError) });
    }
  }

  async function reviewExisting(contract: DashboardContract, rerun = false, resumeOnly = false) {
    const contractId = contract.id ?? contract._id;
    if (!contractId || stage === "reviewing" || getContractReviewMutation.isPending) return;
    setTitle(""); setReviewProgress(null); setReviewResult(null); setWorkflowComplete(false);
    setPendingReviewId(null);
    setPendingReviewFocus("");
    const kind = contract.status === "reviewed" && !rerun && !readReviewSession(contractId) ? "load" : "run";
    setRetryKind(kind);
    try {
      if (kind === "load") {
        const result = await getContractReviewMutation.mutateAsync(contractId);
        setReviewResult(result);
        setWorkflowComplete(true);
      } else if (access.review) {
        await runReview(contractId, "", resumeOnly);
      }
    }
    catch (requestError) {
      if (isReviewCancelled(requestError)) return;
      setPendingReviewId(contractId);
      toast.error("Chưa thể rà soát hợp đồng", { description: reviewErrorMessage(requestError) });
    }
  }

  const openRequestedReview = useEffectEvent(reviewExisting);
  useEffect(() => {
    const contractId = searchParams.get("contract");
    if (!contractId || !data || openedReviewRequest.current === contractId) return;
    let cancelled = false;
    void (async () => {
      try {
        await Promise.resolve();
        if (cancelled) return;
        const contract = data.contracts.find((item) => (item.id ?? item._id) === contractId)
          ?? await contractsApi.getContract(contractId);
        if (cancelled) return;
        openedReviewRequest.current = contractId;
        await openRequestedReview(contract, searchParams.get("rerun") === "1", searchParams.get("reviewMode") === "resume");
      } catch (requestError) {
        if (isReviewCancelled(requestError)) return;
        toast.error("Chưa thể mở hợp đồng", { description: reviewErrorMessage(requestError) });
      }
    })();
    return () => { cancelled = true; };
  }, [data, searchParams]);

  async function retryReview() {
    if (!pendingReviewId || stage === "reviewing" || getContractReviewMutation.isPending) return;
    setWorkflowComplete(false);
    try {
      if (retryKind === "load") {
        const result = await getContractReviewMutation.mutateAsync(pendingReviewId);
        setReviewResult(result);
        setWorkflowComplete(true);
        setPendingReviewId(null);
      } else await runReview(pendingReviewId, pendingReviewFocus);
    }
    catch (requestError) {
      if (isReviewCancelled(requestError)) return;
      toast.error("AI chưa thể hoàn tất rà soát", { description: reviewErrorMessage(requestError) });
    }
  }

  return <>
            <section className="flex [align-items:end] justify-between gap-7 [&_h1]:text-ui-title [&_h1]:font-bold [&_h1]:leading-[1.2] [&_h1]:tracking-[-0.025em] [&_h1]:mt-[7px] [&_h1]:mb-0 [&_h1]:mx-0 [&_div_>_p]:last:max-w-[660px] [&_div_>_p]:last:text-[color:var(--muted)] [&_div_>_p]:last:text-ui [&_div_>_p]:last:leading-[1.6] [&_div_>_p]:last:mt-[9px] [&_div_>_p]:last:mb-0 [&_div_>_p]:last:mx-0 [@media_(max-width:_580px)]:items-start [@media_(max-width:_580px)]:flex-col"><div><p className="text-[color:var(--accent)] text-ui-caption font-semibold tracking-[1.1px] uppercase m-0">{data.role === "user" ? "Dashboard của tôi" : "AI Contract Review"}</p><h1>Rà soát hợp đồng mới</h1><p>Tải hợp đồng lên để AI tóm tắt, nhận diện điều khoản rủi ro và đề xuất hướng chỉnh sửa.</p></div><div className="flex items-center gap-2.5 flex-none text-[#2b5c51] border [background:#f3faf8] px-[13px] py-2.5 rounded-[10px] border-solid border-[#d7e9e4] [&>_svg]:w-5 [&_span_>_*]:block [&_strong]:text-ui [&_small]:text-[#6b817c] [&_small]:text-ui-meta [&_small]:mt-0.5 [@media_(max-width:_580px)]:w-full"><Icon name="shield" /><span><strong>Dữ liệu riêng tư</strong><small>{data.role === "user" ? "Hợp đồng thuộc không gian cá nhân của bạn" : "Chỉ thành viên có quyền mới truy cập được"}</small></span></div></section>
            <ReviewLayout className="mt-7 [@media_(max-width:_580px)]:mt-5"
              form={<div className="border border-[color:var(--line)] [background:white] shadow-[0_22px_50px_-48px_rgb(23_45_78_/_0.7)] rounded-[14px] border-solid">
                <header className="min-h-[74px] flex items-center justify-between gap-[18px] [border-bottom:1px_solid_var(--line)] px-5 py-4 [&>_div]:flex [&>_div]:items-center [&>_div]:gap-3 [&>_div_>_span]:w-8 [&>_div_>_span]:h-8 [&>_div_>_span]:grid [&>_div_>_span]:place-items-center [&>_div_>_span]:text-[color:var(--accent)] [&>_div_>_span]:[background:#eaf1ff] [&>_div_>_span]:text-ui [&>_div_>_span]:font-extrabold [&>_div_>_span]:rounded-[9px] [&_h2]:text-ui-card [&_h2]:font-semibold [&_h2]:m-0 [&_p]:text-[color:var(--muted)] [&_p]:text-ui [&_p]:mt-[3px] [&_p]:mb-0 [&_p]:mx-0 [@media_(max-width:_580px)]:items-start"><div><span>01</span><div><h2>Tải hợp đồng</h2><p>PDF, DOCX, PNG hoặc JPG · Tối đa 20 MB</p></div></div><span className="text-[#356556] [background:#eaf6f1] text-ui-caption font-bold whitespace-nowrap px-2 py-[5px] rounded-md [@media_(max-width:_580px)]:hidden">{access.upload ? "Được phép tải lên" : "Chỉ xem"}</span></header>
                {access.upload ? <ContractUploadForm file={file} title={title} contractType={contractType} typeLabels={availableTypeLabels} profile={selectedProfile} ourParty={ourParty} industry={industry} isUploading={stage === "uploading"} onFileChange={selectFile} onTitleChange={setTitle} onContractTypeChange={(value) => { setContractType(value); setOurParty(""); }} onOurPartyChange={setOurParty} onIndustryChange={setIndustry} /> : <div className="min-h-[310px] flex items-center justify-center gap-3.5 text-left p-[30px] [&>_span]:w-12 [&>_span]:h-12 [&>_span]:grid [&>_span]:place-items-center [&>_span]:text-[#6b7890] [&>_span]:[background:#eff2f6] [&>_span]:rounded-xl [&_svg]:w-[22px] [&_h3]:text-ui-section [&_h3]:font-semibold [&_h3]:m-0 [&_p]:max-w-[420px] [&_p]:text-[color:var(--muted)] [&_p]:text-ui [&_p]:leading-normal [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:mx-0"><span><Icon name="lock" /></span><div><h3>Vai trò của bạn không có quyền tải lên</h3><p>{access.review ? "Bạn vẫn có thể rà soát các hợp đồng đã được đội ngũ tải lên." : "Liên hệ quản trị viên để được cấp quyền phù hợp."}</p></div></div>}
                {stage === "reviewing" && <p role="status" className="m-0 border-t border-[#dbe7fb] bg-[#f3f7ff] px-5 py-3 text-ui text-[#245abf]">{reviewProgress ? reviewProgressLabel(reviewProgress) : "Đang bắt đầu rà soát…"}</p>}
              </div>}
              timeline={<ReviewTimeline review={reviewProgress} result={workflowComplete ? reviewResult : null} uploading={stage === "uploading"} reviewing={reviewContractMutation.isPending} loadingResult={getContractReviewMutation.isPending} reconnecting={reviewContractMutation.reconnecting} error={timelineError} failureKind={retryKind} roleLabel={roleLabel} access={access} onRetry={retryReview} />}
              result={reviewResult && <div ref={reviewResultRef}><ReviewResults result={reviewResult} canAsk={false} showAiContext={false} /></div>}
            />
    {uploadedContract && <AnalysisFocusDialog key={uploadedContract.id} contractTitle={uploadedContract.title} isReviewing={stage === "reviewing"} onSkip={() => { setUploadedContract(null); toast.success("Đã tải hợp đồng lên"); }} onReview={reviewUploadedContract} />}
  </>;
}
