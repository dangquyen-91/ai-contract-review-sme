"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const contractDetailTabs = ["overview", "risks", "terms", "chat", "versions"] as const;
export type ContractDetailTab = (typeof contractDetailTabs)[number];

function isTab(value: string | null): value is ContractDetailTab {
  return contractDetailTabs.includes(value as ContractDetailTab);
}

export function useContractDetailTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get("tab");
  const tab: ContractDetailTab = isTab(value) ? value : "overview";
  const select = (next: ContractDetailTab) => {
    if (next === tab) return;
    router.replace(next === "overview" ? pathname : `${pathname}?tab=${next}`, { scroll: false });
  };
  return [tab, select] as const;
}
