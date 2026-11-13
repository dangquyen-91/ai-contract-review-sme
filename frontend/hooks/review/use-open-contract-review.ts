"use client";

import { usePathname, useRouter } from "next/navigation";
import { routes } from "@/config/routes";
import { useDashboardReviewWorkflow } from "@/providers/review-workflow-provider";
import type { DashboardContract, ReviewBillingConfirmation } from "@/types/contracts";

export function useOpenContractReview() {
  const router = useRouter();
  const pathname = usePathname();
  const { reviewExisting, reviewUploadedContract, uploadedContract } = useDashboardReviewWorkflow();

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

  function startUploadedReview(focus: string, billing?: ReviewBillingConfirmation) {
    const contractId = uploadedContract?.id;
    void reviewUploadedContract(focus, billing);
    if (contractId) goTo(contractId);
  }

  return { openContract, startUploadedReview };
}
