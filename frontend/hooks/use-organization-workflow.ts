"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useRef } from "react";
import { toast } from "sonner";
import { reviewErrorMessage } from "@/hooks/use-review-workflow";
import { useDashboardReviewWorkflow } from "@/providers/review-workflow-provider";
import { useDashboardWorkspace } from "@/hooks/use-dashboard-workspace";
import type { ContractRiskLevel, ContractStatus, DashboardContract } from "@/types/contracts";
import type { DashboardContractFilter } from "@/types/dashboard";
import { organizationDashboardPath, organizationDashboardView, type OrganizationDashboardRole, type OrganizationDashboardView } from "@/lib/organization-dashboard-route";
import { useLoadContract } from "@/hooks/use-contracts";
import { isReviewCancelled } from "@/lib/review-session";

export type DashboardTab = OrganizationDashboardView;

// Share data and actions while each dashboard owns its role-specific views.
export function useOrganizationWorkflow(role: OrganizationDashboardRole) {
  const ownerMode = role === "owner";
  const managerMode = role === "manager";
  const staffMode = role === "staff";
  const reviewerMode = role === "reviewer";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = organizationDashboardView(pathname);
  const statusParam = searchParams.get("status");
  const riskParam = searchParams.get("riskLevel");
  const contractFilter: DashboardContractFilter = {
    ...(["uploaded", "processing", "reviewed", "archived"].includes(statusParam ?? "") ? { status: statusParam as ContractStatus } : {}),
    ...(["high", "medium", "low", "none"].includes(riskParam ?? "") ? { riskLevel: riskParam as ContractRiskLevel } : {}),
  };
  const returnLocation = useRef<{ url: string; scroll: number } | null>(null);
  const returnScroll = useRef<number | null>(null);
  const openedReviewRequest = useRef<string | null>(null);
  const { data, error, isLoading, isFetching, dataUpdatedAt, refetch, access, roleLabel } = useDashboardWorkspace();
  const { file, title, setTitle, uploadedContract, setUploadedContract, cancelReview, cancelling, reviewResult, reviewProgress, reviewResultRef, timelineScrollRequest, pendingReviewId, retryKind, reviewError, reviewBlocked, stage, isReviewing, selectFile, reviewUploadedContract, reviewExisting: performReviewExisting, retryReview, activeReviewRequest, workflowComplete, reviewing, loadingResult, reconnecting } = useDashboardReviewWorkflow();
  const openReview = useEffectEvent(performReviewExisting);
  const loadContract = useLoadContract();

  useEffect(() => {
    const contractId = searchParams.get("contract");
    if (!contractId) {
      openedReviewRequest.current = null;
      return;
    }
    if (activeTab !== "upload" || !data || !access.review || openedReviewRequest.current === contractId) return;
    openedReviewRequest.current = contractId;
    if (activeReviewRequest.current === contractId) return;
    let cancelled = false;
    let initiated = false;
    void (async () => {
      try {
        await Promise.resolve();
        if (cancelled) return;
        const contract = data.contracts.find((item) => (item.id ?? item._id) === contractId)
          ?? await loadContract(contractId);
        if (!cancelled) {
          initiated = true;
          await openReview(contract, searchParams.get("rerun") === "1", searchParams.get("reviewMode") === "resume");
        }
      } catch (requestError) {
        if (cancelled || isReviewCancelled(requestError)) return;
        toast.error("Chưa thể mở hợp đồng", { description: reviewErrorMessage(requestError) });
      }
    })();
    return () => {
      cancelled = true;
      if (!initiated && openedReviewRequest.current === contractId) openedReviewRequest.current = null;
    };
  }, [activeTab, data, access.review, searchParams, activeReviewRequest, loadContract]);

  useEffect(() => {
    if (activeTab === "upload" || returnScroll.current === null) return;
    const top = returnScroll.current;
    returnScroll.current = null;
    const frame = requestAnimationFrame(() => window.scrollTo({ top, behavior: "instant" }));
    return () => cancelAnimationFrame(frame);
  }, [activeTab]);

  function selectTab(tab: DashboardTab, filter: DashboardContractFilter = {}) {
    if (!ownerMode && (tab === "administration" || tab === "members")) return;
    const params = new URLSearchParams();
    if (tab === "contracts") {
      const search = searchParams.get("search");
      if (search && activeTab === "contracts") params.set("search", search);
      if (filter.status) params.set("status", filter.status);
      if (filter.riskLevel) params.set("riskLevel", filter.riskLevel);
    }
    router.replace(`${organizationDashboardPath(role, tab)}${params.size ? `?${params}` : ""}`, { scroll: false });
  }

  function backToWork() {
    const previous = returnLocation.current;
    if (previous) {
      returnScroll.current = previous.scroll;
      router.replace(previous.url, { scroll: false });
    } else selectTab("contracts");
  }

  function skipUploadedReview() {
    const uploadedTitle = uploadedContract?.title;
    const uploadedId = uploadedContract?.id;
    setUploadedContract(null);
    toast.success("Đã tải hợp đồng lên");
    if (uploadedTitle && (staffMode || managerMode)) {
      const params = new URLSearchParams({ search: uploadedTitle, page: "1" });
      if (uploadedId) params.set("uploaded", uploadedId);
      router.replace(`${organizationDashboardPath(role, "contracts")}?${params}`, { scroll: false });
    }
  }

  function clearUploadedContract() {
    setUploadedContract(null);
  }

  function reviewExisting(contract: DashboardContract, rerun = false) {
    if (!(contract.id ?? contract._id) || contract.status === "archived" || isReviewing) return;
    if (staffMode || reviewerMode || managerMode) {
      if (activeTab !== "upload") returnLocation.current = { url: `${pathname}${searchParams.size ? `?${searchParams}` : ""}`, scroll: window.scrollY };
    }
    selectTab("upload");
    void performReviewExisting(contract, rerun);
  }
  return { activeTab, searchParams, contractFilter, data, error, isLoading, isFetching, dataUpdatedAt, refetch, access, roleLabel, selectTab, backToWork, skipUploadedReview, clearUploadedContract, reviewExisting, cancelReview, cancelling, file, title, setTitle, uploadedContract, reviewResult, reviewProgress, reviewResultRef, timelineScrollRequest, pendingReviewId, retryKind, reviewError, reviewBlocked, stage, isReviewing, selectFile, reviewUploadedContract, retryReview, workflowComplete, reviewing, loadingResult, reconnecting };
}

export type OrganizationWorkflow = ReturnType<typeof useOrganizationWorkflow>;
