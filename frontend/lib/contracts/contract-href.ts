import { routes } from "@/config/routes";
import type { DashboardContract } from "@/types/contracts";

export function contractPageHref(contract: DashboardContract, rerun = false) {
  const id = contract.id ?? contract._id;
  if (!id) return null;
  return rerun || contract.status === "uploaded" ? `${routes.contract(id)}?action=review` : routes.contract(id);
}
