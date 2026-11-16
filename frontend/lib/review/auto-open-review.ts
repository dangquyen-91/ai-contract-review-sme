import type { DashboardContract } from "@/types/contracts";

export function shouldAutoOpenReview(contract: DashboardContract, rerun: boolean, resume: boolean) {
  return rerun || resume || contract.status === "reviewed" || contract.status === "processing";
}
