"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
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
    setReviewProgress(null);
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
    setTitle(""); setReviewResult(null); setWorkflowComplete(false);
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
    {reviewContractMutation.reconnecting && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Mất kết nối tạm thời. Đang theo dõi lại lượt rà soát đã lưu.</p>}
            <section className="flex [align-items:end] justify-between gap-7 [&_h1]:text-[length:clamp(30px,3vw,42px)] [&_h1]:leading-[1.12] [&_h1]:tracking-[-1.5px] [&_h1]:mt-[7px] [&_h1]:mb-0 [&_h1]:mx-0 [&_div_>_p]:last:max-w-[660px] [&_div_>_p]:last:text-[color:var(--muted)] [&_div_>_p]:last:text-[length:13px] [&_div_>_p]:last:leading-[1.6] [&_div_>_p]:last:mt-[9px] [&_div_>_p]:last:mb-0 [&_div_>_p]:last:mx-0 [@media_(max-width:_580px)]:items-start [@media_(max-width:_580px)]:flex-col [&_h1]:[@media_(max-width:_580px)]:text-[length:31px]"><div><p className="text-[color:var(--accent)] text-[length:10px] font-[780] tracking-[1.1px] uppercase m-0">{data.role === "user" ? "Dashboard của tôi" : "AI Contract Review"}</p><h1>Rà soát hợp đồng mới</h1><p>Tải hợp đồng lên để AI tóm tắt, nhận diện điều khoản rủi ro và đề xuất hướng chỉnh sửa.</p></div><div className="flex items-center gap-2.5 flex-none text-[#2b5c51] border [background:#f3faf8] px-[13px] py-2.5 rounded-[10px] border-solid border-[#d7e9e4] [&>_svg]:w-5 [&_span_>_*]:block [&_strong]:text-[length:10px] [&_small]:text-[#6b817c] [&_small]:text-[length:9px] [&_small]:mt-0.5 [@media_(max-width:_580px)]:w-full"><Icon name="shield" /><span><strong>Dữ liệu riêng tư</strong><small>{data.role === "user" ? "Hợp đồng thuộc không gian cá nhân của bạn" : "Chỉ thành viên có quyền mới truy cập được"}</small></span></div></section>
            <section className="grid grid-cols-[minmax(0,1.65fr)_minmax(250px,0.58fr)] gap-5 [align-items:start] mt-7 [@media_(max-width:_1100px)]:grid-cols-[1fr] [@media_(max-width:_580px)]:mt-5">
              <div className="border border-[color:var(--line)] [background:white] shadow-[0_22px_50px_-48px_rgb(23_45_78_/_0.7)] rounded-[14px] border-solid">
                <header className="min-h-[74px] flex items-center justify-between gap-[18px] [border-bottom:1px_solid_var(--line)] px-5 py-4 [&>_div]:flex [&>_div]:items-center [&>_div]:gap-3 [&>_div_>_span]:w-8 [&>_div_>_span]:h-8 [&>_div_>_span]:grid [&>_div_>_span]:place-items-center [&>_div_>_span]:text-[color:var(--accent)] [&>_div_>_span]:[background:#eaf1ff] [&>_div_>_span]:text-[length:10px] [&>_div_>_span]:font-extrabold [&>_div_>_span]:rounded-[9px] [&_h2]:text-[length:14px] [&_h2]:m-0 [&_p]:text-[color:var(--muted)] [&_p]:text-[length:10px] [&_p]:mt-[3px] [&_p]:mb-0 [&_p]:mx-0 [@media_(max-width:_580px)]:items-start"><div><span>01</span><div><h2>Tải hợp đồng</h2><p>PDF, DOCX, PNG hoặc JPG · Tối đa 20 MB</p></div></div><span className="text-[#356556] [background:#eaf6f1] text-[length:9px] font-bold whitespace-nowrap px-2 py-[5px] rounded-md [@media_(max-width:_580px)]:hidden">{access.upload ? "Được phép tải lên" : "Chỉ xem"}</span></header>
                {access.upload ? <ContractUploadForm file={file} title={title} contractType={contractType} typeLabels={availableTypeLabels} profile={selectedProfile} ourParty={ourParty} industry={industry} isUploading={stage === "uploading"} onFileChange={selectFile} onTitleChange={setTitle} onContractTypeChange={(value) => { setContractType(value); setOurParty(""); }} onOurPartyChange={setOurParty} onIndustryChange={setIndustry} /> : <div className="min-h-[310px] flex items-center justify-center gap-3.5 text-left p-[30px] [&>_span]:w-12 [&>_span]:h-12 [&>_span]:grid [&>_span]:place-items-center [&>_span]:text-[#6b7890] [&>_span]:[background:#eff2f6] [&>_span]:rounded-xl [&_svg]:w-[22px] [&_h3]:text-[length:14px] [&_h3]:m-0 [&_p]:max-w-[420px] [&_p]:text-[color:var(--muted)] [&_p]:text-[length:11px] [&_p]:leading-normal [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:mx-0"><span><Icon name="lock" /></span><div><h3>Vai trò của bạn không có quyền tải lên</h3><p>{access.review ? "Bạn vẫn có thể rà soát các hợp đồng đã được đội ngũ tải lên." : "Liên hệ quản trị viên để được cấp quyền phù hợp."}</p></div></div>}
                {stage === "reviewing" && <p role="status" className="m-0 border-t border-[#dbe7fb] bg-[#f3f7ff] px-5 py-3 text-xs text-[#245abf]">{reviewProgress ? reviewProgressLabel(reviewProgress) : "Đang bắt đầu rà soát…"}</p>}
                {pendingReviewId && <div className="flex items-center justify-between gap-3 [border-top:1px_solid_#f3dcc7] [background:#fff9f1] px-5 py-3 [&_p]:text-[#815b2d] [&_p]:text-[length:10px] [&_p]:m-0 [&_button]:min-h-[30px] [&_button]:inline-flex [&_button]:items-center [&_button]:gap-1.5 [&_button]:text-[#8d5e24] [&_button]:border [&_button]:[background:white] [&_button]:[font:inherit] [&_button]:cursor-pointer [&_button]:whitespace-nowrap [&_button]:rounded-[7px] [&_button]:border-solid [&_button]:border-[#e8ca9f] [&_button]:[font-size:9px] [&_button]:[font-weight:700] [&_button_svg]:w-[13px]"><p>{retryKind === "load" ? "Chưa tải được kết quả đã lưu. Thử lại không chạy AI mới." : "Yêu cầu đã lưu. Tiếp tục theo dõi lượt hiện tại; nếu lượt đã thất bại, thử lại sẽ tạo lượt mới."}</p><button type="button" onClick={retryReview} disabled={stage === "reviewing" || getContractReviewMutation.isPending}>{retryKind === "load" ? "Tải lại kết quả" : "Tiếp tục / thử lại rà soát"} <Icon name="arrow" /></button></div>}
              </div>
              <aside className="border border-[color:var(--line)] [background:white] shadow-[0_22px_50px_-48px_rgb(23_45_78_/_0.7)] rounded-[14px] border-solid p-[19px] [@media_(max-width:_1100px)]:grid [@media_(max-width:_1100px)]:grid-cols-[0.6fr_1fr_0.7fr] [@media_(max-width:_1100px)]:gap-5 [@media_(max-width:_1100px)]:[align-items:start] [@media_(max-width:_820px)]:grid-cols-[1fr]"><div className="[&_h2]:text-[length:14px] [&_h2]:m-0 [&_p]:text-[color:var(--muted)] [&_p]:text-[length:10px] [&_p]:mt-[3px] [&_p]:mb-0 [&_p]:mx-0 grid grid-cols-[40px_minmax(0,1fr)] items-center gap-[11px] [&>_span]:w-10 [&>_span]:h-10 [&>_span]:grid [&>_span]:place-items-center [&>_span]:text-[color:var(--accent)] [&>_span]:[background:#edf3ff] [&>_span]:rounded-[10px] [&_svg]:w-[19px]"><span><Icon name="sparkle" /></span><div><h2>Quy trình AI</h2><p>Khoảng 1–3 phút</p></div></div><ol className="grid gap-0 [list-style:none] mt-[23px] mb-0 mx-0 p-0 [&_li]:relative [&_li]:grid [&_li]:grid-cols-[30px_minmax(0,1fr)] [&_li]:gap-2.5 [&_li]:min-h-16 [&_li]:text-[#98a2b1] [&_li:not(:last-child)]:before:content-[''] [&_li:not(:last-child)]:before:absolute [&_li:not(:last-child)]:before:w-px [&_li:not(:last-child)]:before:[background:#e1e6ed] [&_li:not(:last-child)]:before:left-3.5 [&_li:not(:last-child)]:before:top-[29px] [&_li:not(:last-child)]:before:bottom-0 [&_li_>_span]:w-[30px] [&_li_>_span]:h-[30px] [&_li_>_span]:grid [&_li_>_span]:place-items-center [&_li_>_span]:border [&_li_>_span]:[background:white] [&_li_>_span]:rounded-[50%] [&_li_>_span]:border-solid [&_li_>_span]:border-[#dde3eb] [&_svg]:w-[13px] [&_strong]:block [&_small]:block [&_strong]:text-[length:10px] [&_strong]:mt-0.5 [&_small]:text-[length:9px] [&_small]:mt-[3px] [&_i]:w-3 [&_i]:h-3 [&_i]:[animation:spin_0.8s_linear_infinite] [&_i]:rounded-[50%] [&_i]:border-t-[#245abf] [&_i]:border-2 [&_i]:border-solid [&_i]:border-[#8faee9] [@media_(max-width:_1100px)]:mt-0 [&_i]:motion-reduce:animate-none"><li className={stage !== "idle" ? "text-[#245abf] [&>_span]:[background:#eaf1ff] [&>_span]:border-[#b9cef6]" : ""}><span>{stage === "uploading" ? <i /> : <Icon name="check" />}</span><div><strong>Đọc tài liệu</strong><small>Trích xuất nội dung hợp đồng</small></div></li><li className={stage === "reviewing" || stage === "done" ? "text-[#245abf] [&>_span]:[background:#eaf1ff] [&>_span]:border-[#b9cef6]" : ""}><span>{stage === "reviewing" ? <i /> : <Icon name="sparkle" />}</span><div><strong>Phân tích điều khoản</strong><small>Đối chiếu dữ liệu pháp lý</small></div></li><li className={stage === "done" ? "text-[#245abf] [&>_span]:[background:#eaf1ff] [&>_span]:border-[#b9cef6]" : ""}><span><Icon name="shield" /></span><div><strong>Tổng hợp rủi ro</strong><small>Giải thích và đề xuất chỉnh sửa</small></div></li></ol><div className="[background:#f6f8fb] mt-2 p-3.5 rounded-[10px] [&>_span]:text-[color:var(--muted)] [&>_span]:text-[length:9px] [&>_span]:uppercase [&>_span]:tracking-[0.6px] [&>_strong]:block [&>_strong]:text-[length:11px] [&>_strong]:mt-1 [&_ul]:grid [&_ul]:gap-1.5 [&_ul]:[list-style:none] [&_ul]:mt-[11px] [&_ul]:mb-0 [&_ul]:mx-0 [&_ul]:p-0 [&_li]:relative [&_li]:text-[#9aa3b0] [&_li]:text-[length:9px] [&_li]:pl-[17px] [&_li]:before:content-['×'] [&_li]:before:absolute [&_li]:before:font-extrabold [&_li]:before:left-0 [@media_(max-width:_1100px)]:mt-0"><span>Quyền hiện tại</span><strong>{roleLabel}</strong><ul><li className={access.upload ? "text-[#3e675d] before:content-['✓'] before:text-[#24806a]" : ""}>Tải hợp đồng</li><li className={access.review ? "text-[#3e675d] before:content-['✓'] before:text-[#24806a]" : ""}>Chạy AI review</li>{access.administer && <li className="text-[#3e675d] before:content-['✓'] before:text-[#24806a]">Quản trị tổ chức</li>}</ul></div></aside>
            </section>
            {reviewResult && <div ref={reviewResultRef}><ReviewResults result={reviewResult} canAsk={false} showAiContext={false} /></div>}
    {uploadedContract && <AnalysisFocusDialog key={uploadedContract.id} contractTitle={uploadedContract.title} isReviewing={stage === "reviewing"} onSkip={() => { setUploadedContract(null); toast.success("Đã tải hợp đồng lên"); }} onReview={reviewUploadedContract} />}
  </>;
}
