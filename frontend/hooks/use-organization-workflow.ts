"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useReviewWorkflow } from "@/hooks/use-review-workflow";
import { useDashboardWorkspace } from "@/hooks/use-dashboard-workspace";
import type { ContractRiskLevel, ContractStatus, DashboardContract } from "@/types/contracts";
import type { DashboardContractFilter } from "@/types/dashboard";

export type DashboardTab = "overview" | "upload" | "contracts" | "administration" | "members";

// Share data and actions while each dashboard owns its role-specific views.
export function useOrganizationWorkflow(role: "owner" | "manager" | "staff" | "reviewer") {
  const ownerMode = role === "owner";
  const managerMode = role === "manager";
  const staffMode = role === "staff";
  const reviewerMode = role === "reviewer";
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view");
  const activeTab: DashboardTab = (reviewerMode ? requestedView === "review" : requestedView === "upload")
    ? "upload" : requestedView === "contracts" ? "contracts"
    : ownerMode && (requestedView === "administration" || requestedView === "members") ? requestedView : "overview";
  const statusParam = searchParams.get("status");
  const riskParam = searchParams.get("riskLevel");
  const contractFilter: DashboardContractFilter = {
    ...(["uploaded", "processing", "reviewed", "archived"].includes(statusParam ?? "") ? { status: statusParam as ContractStatus } : {}),
    ...(["high", "medium", "low", "none"].includes(riskParam ?? "") ? { riskLevel: riskParam as ContractRiskLevel } : {}),
  };
  const returnLocation = useRef<{ url: string; scroll: number } | null>(null);
  const returnScroll = useRef<number | null>(null);
  const { data, error, isLoading, isFetching, dataUpdatedAt, refetch, access, roleLabel } = useDashboardWorkspace();
  const { file, title, setTitle, contractType, setContractType, ourParty, setOurParty, industry, setIndustry, uploadedContract, setUploadedContract, reviewResult, reviewProgress, reviewResultRef, pendingReviewId, retryKind, reviewError, stage, isReviewing, selectedProfile, selectFile, reviewUploadedContract, reviewExisting: performReviewExisting, retryReview } = useReviewWorkflow({ access, initialType: "service" });

  useEffect(() => {
    if (activeTab === "upload" || returnScroll.current === null) return;
    const top = returnScroll.current;
    returnScroll.current = null;
    const frame = requestAnimationFrame(() => window.scrollTo({ top, behavior: "instant" }));
    return () => cancelAnimationFrame(frame);
  }, [activeTab]);

  function selectTab(tab: DashboardTab, filter: DashboardContractFilter = {}) {
    if (!ownerMode && (tab === "administration" || tab === "members")) return;
    if (ownerMode) router.replace(tab === "overview" ? "/dashboard/owner" : `/dashboard/owner?view=${tab}`, { scroll: false });
    if (staffMode || reviewerMode || managerMode) {
      const base = reviewerMode ? "/dashboard/reviewer" : managerMode ? "/dashboard/manager" : "/dashboard/staff";
      const params = new URLSearchParams();
      if (tab !== "overview") params.set("view", reviewerMode && tab === "upload" ? "review" : tab);
      if (tab === "contracts") {
        const search = searchParams.get("search");
        if (search && activeTab === "contracts") params.set("search", search);
        if (filter.status) params.set("status", filter.status);
        if (filter.riskLevel) params.set("riskLevel", filter.riskLevel);
      }
      router.replace(`${base}${params.size ? `?${params}` : ""}`, { scroll: false });
    }
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
      const params = new URLSearchParams({ view: "contracts", search: uploadedTitle, page: "1" });
      if (uploadedId) params.set("uploaded", uploadedId);
      router.replace(`${managerMode ? "/dashboard/manager" : "/dashboard/staff"}?${params}`, { scroll: false });
    }
  }

  function reviewExisting(contract: DashboardContract, rerun = false) {
    if (!(contract.id ?? contract._id) || contract.status === "archived" || isReviewing) return;
    if (staffMode || reviewerMode || managerMode) {
      const base = reviewerMode ? "/dashboard/reviewer" : managerMode ? "/dashboard/manager" : "/dashboard/staff";
      if (activeTab !== "upload") returnLocation.current = { url: `${base}${searchParams.size ? `?${searchParams}` : ""}`, scroll: window.scrollY };
    }
    selectTab("upload");
    void performReviewExisting(contract, rerun);
  }
  return { activeTab, searchParams, contractFilter, data, error, isLoading, isFetching, dataUpdatedAt, refetch, access, roleLabel, selectTab, backToWork, skipUploadedReview, reviewExisting, file, title, setTitle, contractType, setContractType, ourParty, setOurParty, industry, setIndustry, uploadedContract, reviewResult, reviewProgress, reviewResultRef, pendingReviewId, retryKind, reviewError, stage, isReviewing, selectedProfile, selectFile, reviewUploadedContract, retryReview };
}

export type OrganizationWorkflow = ReturnType<typeof useOrganizationWorkflow>;
