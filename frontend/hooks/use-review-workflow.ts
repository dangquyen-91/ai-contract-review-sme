"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useContractProfiles, useContractReviewResult, useReviewContractMutation, useUploadContractMutation } from "@/hooks/use-contracts";
import { isApiClientError } from "@/lib/api/client";
import { isReviewCancelled, readReviewSession } from "@/lib/review-session";
import { reviewBlockReason, reviewBlockedMessage, type ReviewBlockReason } from "@/lib/review-failure";
import type { ContractReviewRun, DashboardContract } from "@/types/contracts";

type ReviewStage = "idle" | "uploading" | "reviewing" | "done";
type Access = { upload: boolean; review: boolean };

export function reviewErrorMessage(error: unknown) {
  const blocked = reviewBlockReason(error);
  if (blocked) return reviewBlockedMessage(blocked);
  if (isApiClientError(error) && error.status === 409) {
    return "Hợp đồng đang được phân tích ở một phiên khác. Vui lòng thử lại sau khi quá trình đó hoàn tất.";
  }
  return error instanceof Error ? error.message : "Vui lòng thử lại sau.";
}

export function useReviewWorkflow({ access, initialType, personal = false, reviewPath }: { access: Access; initialType: DashboardContract["type"]; personal?: boolean; reviewPath?: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [contractType, setContractType] = useState<DashboardContract["type"]>(initialType);
  const [ourParty, setOurParty] = useState("");
  const [industry, setIndustry] = useState("");
  const [uploadedContract, setUploadedContract] = useState<{ id: string; title: string } | null>(null);
  const [workflowComplete, setWorkflowComplete] = useState(false);
  const [timelineScrollRequest, setTimelineScrollRequest] = useState(0);
  const [selectedContractId, setSelectedContractId] = useState("");
  const [reviewProgress, setReviewProgress] = useState<ContractReviewRun | null>(null);
  const reviewResultRef = useRef<HTMLDivElement>(null);
  const activeReviewRequest = useRef<string | null>(null);
  const [pendingReviewId, setPendingReviewId] = useState<string | null>(null);
  const [pendingReviewFocus, setPendingReviewFocus] = useState("");
  const [retryKind, setRetryKind] = useState<"load" | "run">("run");
  const [reviewError, setReviewError] = useState("");
  const [reviewBlocked, setReviewBlocked] = useState<ReviewBlockReason | null>(null);
  const uploadContractMutation = useUploadContractMutation();
  const reviewContractMutation = useReviewContractMutation();
  const resultQuery = useContractReviewResult(selectedContractId);
  const reviewResult = workflowComplete ? resultQuery.data ?? null : null;
  const { data: profiles } = useContractProfiles();
  const selectedProfile = profiles?.find((profile) => profile.code === contractType);
  const stage: ReviewStage = uploadContractMutation.isPending ? "uploading" : reviewContractMutation.isPending ? "reviewing" : workflowComplete ? "done" : "idle";
  const isReviewing = stage === "reviewing" || resultQuery.isLoadingResult;

  useEffect(() => {
    if (workflowComplete) reviewResultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [workflowComplete, selectedContractId]);

  async function selectFile(nextFile?: File): Promise<boolean> {
    if (!nextFile || !access.upload || uploadContractMutation.isPending || isReviewing) return false;
    const validTypes = new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg"]);
    if (!validTypes.has(nextFile.type)) {
      toast.error("Định dạng chưa được hỗ trợ", { description: "Vui lòng chọn PDF, DOCX, PNG hoặc JPG." });
      return false;
    }
    if (nextFile.size > 20 * 1024 * 1024) { toast.error("Tệp vượt quá 20 MB"); return false; }
    const uploadTitle = title.trim() || nextFile.name.replace(/\.[^.]+$/, "").trim() || "Hợp đồng mới";
    if (uploadTitle.length < 2) { toast.error("Tên hợp đồng phải có ít nhất 2 ký tự"); return false; }
    setFile(nextFile);
    setTitle(uploadTitle);
    setSelectedContractId("");
    setReviewProgress(null);
    setPendingReviewId(null);
    setPendingReviewFocus("");
    setReviewError("");
    setReviewBlocked(null);
    setWorkflowComplete(false);
    const formData = new FormData();
    formData.set("file", nextFile);
    formData.set("title", uploadTitle);
    formData.set("type", contractType);
    if (personal && contractType === "labor") formData.set("ourParty", "employee");
    else if (ourParty) formData.set("ourParty", ourParty);
    if (industry) formData.set("industry", industry);
    try {
      const contract = await uploadContractMutation.mutateAsync(formData);
      const contractId = contract.id ?? contract._id;
      setFile(null);
      setTitle("");
      if (access.review && contractId) setUploadedContract({ id: contractId, title: contract.title });
      else toast.success("Đã tải hợp đồng lên");
      return true;
    } catch (error) {
      toast.error("Chưa thể tải hợp đồng lên", { description: reviewErrorMessage(error) });
      return false;
    }
  }

  async function runReview(contractId: string, focus = "", resumeOnly = false) {
    setSelectedContractId(contractId);
    setRetryKind("run");
    setReviewError("");
    setReviewBlocked(null);
    setReviewProgress(null);
    activeReviewRequest.current = contractId;
    window.history.replaceState(window.history.state, "", `${reviewPath ?? window.location.pathname}?${new URLSearchParams({ contract: contractId, reviewMode: "resume" })}`);
    let result;
    try { result = await reviewContractMutation.mutateAsync({ contractId, analysisFocus: focus.trim() || undefined, resumeOnly, onProgress: (review) => {
      setReviewProgress(review);
      if (review.status === "completed") setRetryKind("load");
    } }); }
    catch (error) { setReviewBlocked(reviewBlockReason(error)); throw error; }
    setPendingReviewId(null);
    setPendingReviewFocus("");
    setWorkflowComplete(true);
    toast.success("AI đã hoàn tất rà soát", { description: `Đã phát hiện ${result.findings.length} điểm cần lưu ý.` });
  }

  async function reviewUploadedContract(focus: string) {
    if (!uploadedContract) return;
    const contractId = uploadedContract.id;
    setTitle(uploadedContract.title);
    setUploadedContract(null);
    setTimelineScrollRequest((request) => request + 1);
    try { await runReview(contractId, focus); }
    catch (error) {
      if (isReviewCancelled(error)) return;
      setPendingReviewId(contractId);
      setPendingReviewFocus(focus);
      const blocked = reviewBlockReason(error);
      setReviewError(blocked ? reviewBlockedMessage(blocked) : "Hợp đồng đã tải lên thành công. Chưa hoàn tất phân tích; bạn không cần tải lại tài liệu.");
      toast.error(blocked ? "Chưa bắt đầu rà soát" : "Đã tải lên, nhưng AI chưa hoàn tất", { description: reviewErrorMessage(error) });
    }
  }

  async function reviewExisting(contract: DashboardContract, rerun = false, resumeOnly = false) {
    const contractId = contract.id ?? contract._id;
    if (!contractId || contract.status === "archived" || isReviewing) return false;
    activeReviewRequest.current = contractId;
    const kind = contract.status === "reviewed" && !rerun && !readReviewSession(contractId) ? "load" : "run";
    setRetryKind(kind);
    setPendingReviewId(null);
    setPendingReviewFocus("");
    setReviewError("");
    setReviewBlocked(null);
    setTitle(contract.title);
    setReviewProgress(null);
    setSelectedContractId(contractId);
    setWorkflowComplete(false);
    try {
      if (kind === "load") {
        await resultQuery.load(contractId);
        setWorkflowComplete(true);
      } else if (access.review) await runReview(contractId, "", resumeOnly);
    } catch (error) {
      if (isReviewCancelled(error)) return false;
      setPendingReviewId(contractId);
      const blocked = kind === "run" ? reviewBlockReason(error) : null;
      setReviewError(blocked ? reviewBlockedMessage(blocked) : kind === "load" ? "Chưa tải được kết quả đã lưu. Hãy thử tải lại kết quả hoặc quay về danh sách." : "Chưa hoàn tất phân tích hợp đồng. Tài liệu vẫn được giữ trong tổ chức.");
      toast.error(blocked ? "Chưa bắt đầu rà soát" : "Chưa thể rà soát hợp đồng", { description: reviewErrorMessage(error) });
    }
    return true;
  }

  async function retryReview() {
    if (!pendingReviewId || isReviewing || reviewBlocked) return;
    setWorkflowComplete(false);
    try {
      if (retryKind === "load") {
        await resultQuery.load(pendingReviewId);
        setWorkflowComplete(true);
        setPendingReviewId(null);
        setReviewError("");
      } else await runReview(pendingReviewId, pendingReviewFocus);
    } catch (error) {
      if (isReviewCancelled(error)) return;
      const blocked = retryKind === "run" ? reviewBlockReason(error) : null;
      setReviewError(blocked ? reviewBlockedMessage(blocked) : retryKind === "load" ? "Chưa tải được kết quả. Bạn có thể thử lại hoặc quay về danh sách." : "Phân tích chưa hoàn tất. Tài liệu vẫn được giữ; bạn có thể thử lại sau.");
      toast.error(blocked ? "Chưa bắt đầu rà soát" : "AI chưa thể hoàn tất rà soát", { description: reviewErrorMessage(error) });
    }
  }

  return { file, title, setTitle, contractType, setContractType, ourParty, setOurParty, industry, setIndustry, uploadedContract, setUploadedContract, reviewResult, reviewProgress, reviewResultRef, timelineScrollRequest, pendingReviewId, retryKind, reviewError, reviewBlocked, stage, isReviewing, selectedProfile, profiles, selectFile, runReview, reviewUploadedContract, reviewExisting, retryReview, activeReviewRequest, workflowComplete, reviewing: reviewContractMutation.isPending, loadingResult: resultQuery.isLoadingResult, reconnecting: reviewContractMutation.reconnecting };
}
