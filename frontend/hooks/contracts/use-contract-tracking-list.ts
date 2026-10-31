"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseAsString, useQueryStates } from "nuqs";
import { paginationPageParser } from "@/hooks/shared/use-pagination-page";
import { useContractsList } from "./use-contracts";
import type { DashboardContractFilter } from "@/types/dashboard";

const params = {
  page: paginationPageParser,
  search: parseAsString.withDefault(""),
  status: parseAsString.withDefault(""),
  riskLevel: parseAsString.withDefault(""),
  verificationStatus: parseAsString.withDefault(""),
};

export function useContractTrackingList(scope: string, enabled: boolean) {
  const [state, setState] = useQueryStates(params, { history: "push" });
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter: DashboardContractFilter = {
    ...(["uploaded", "processing", "reviewed", "archived", "unsupported"].includes(state.status) ? { status: state.status as DashboardContractFilter["status"] } : {}),
    ...(["high", "medium", "low", "none"].includes(state.riskLevel) ? { riskLevel: state.riskLevel as DashboardContractFilter["riskLevel"] } : {}),
    ...(["not_sent", "requested", "in_progress", "approved", "returned"].includes(state.verificationStatus) ? { verificationStatus: state.verificationStatus as DashboardContractFilter["verificationStatus"] } : {}),
  };
  const query = useContractsList({ ...filter, page: state.page, search: state.search || undefined }, { scope, enabled, pollProcessing: true });
  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 10));
  useEffect(() => {
    if (query.data && !query.isFetching && state.page > pages) void setState({ page: pages }, { history: "replace" });
  }, [query.data, query.isFetching, state.page, pages, setState]);

  function dismissUpload() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("uploaded");
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  return {
    query, state, filter, total, pages,
    highlightId: searchParams.get("uploaded") ?? undefined,
    filtered: Boolean(state.search || filter.status || filter.riskLevel || filter.verificationStatus),
    setSearch: (search: string) => setState({ search, page: 1 }),
    setFilter: (next: DashboardContractFilter) => setState({ page: 1, status: next.status ?? "", riskLevel: next.riskLevel ?? "", verificationStatus: next.verificationStatus ?? "" }),
    setVerification: (verificationStatus: string) => setState({ page: 1, verificationStatus }),
    setPage: (page: number) => setState({ page }),
    resetFilters: () => setState({ page: 1, search: "", status: "", riskLevel: "", verificationStatus: "" }),
    dismissUpload,
  };
}

export type ContractTrackingController = ReturnType<typeof useContractTrackingList>;
