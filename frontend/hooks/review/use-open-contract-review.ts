"use client";

import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { routes } from "@/config/routes";
import { useDashboardReviewWorkflow } from "@/providers/review-workflow-provider";
import type { DashboardContract, ReviewBillingConfirmation } from "@/types/contracts";

type ReviewTarget = { id: string; title: string };

export function useOpenContractReview() {
  const router = useRouter();
  const pathname = usePathname();
  const { reviewExisting, reviewUploadedContract, uploadedContract, setUploadedContract } = useDashboardReviewWorkflow();

  function goTo(contractId: string) {
    const href = routes.contract(contractId);
    if (pathname !== href) router.push(href);
  }

  function openContract(contract: DashboardContract, rerun = false) {
    const contractId = contract.id ?? contract._id;
    if (!contractId) return;
    if (rerun) void reviewExisting(contract, true);
    goTo(contractId);
  }

  function startUploadedReview(focus: string, billing?: ReviewBillingConfirmation, target?: ReviewTarget) {
    const contractId = target?.id ?? uploadedContract?.id;
    void reviewUploadedContract(focus, billing, target);
    if (contractId) goTo(contractId);
  }

  function finishAttach(target: ReviewTarget, versionNumber: number) {
    setUploadedContract(null);
    toast.success(`Đã lưu thành phiên bản ${versionNumber}`, { description: target.title });
    goTo(target.id);
  }

  return { openContract, startUploadedReview, finishAttach };
}
