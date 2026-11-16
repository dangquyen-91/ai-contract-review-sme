"use client";

import { useRouter } from "next/navigation";
import { contractListReturnScope, readContractListReturn } from "@/lib/contracts/contract-list-return";
import { routes } from "@/config/routes";
import type { DashboardData } from "@/types/dashboard";

export function useBackToContractList(data: DashboardData, contractId: string) {
  const router = useRouter();
  return () => {
    const previous = data.user?.email ? readContractListReturn(contractListReturnScope(data)) : null;
    router.push(previous?.contractId === contractId ? previous.href : routes.contracts, { scroll: false });
  };
}
