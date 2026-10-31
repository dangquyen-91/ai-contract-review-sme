"use client";

import { useEffect } from "react";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { paginationPageParser } from "@/hooks/shared/use-pagination-page";
import { useQuery } from "@tanstack/react-query";
import { expertWorkspaceApi } from "@/lib/api/expert-workspace";
import { expertVerificationKeys } from "@/lib/query-keys/expert-verification";
import type { ExpertWorkFilter } from "@/types/expert-work";

const initialFilter: Omit<ExpertWorkFilter, "limit"> = {
  status: "all", search: "", type: "", from: "", to: "", page: 1,
};
const params = {
  status: parseAsStringLiteral(["all", "in_progress", "approved", "returned"] as const).withDefault("in_progress"),
  search: parseAsString.withDefault(""), type: parseAsString.withDefault(""),
  from: parseAsString.withDefault(""), to: parseAsString.withDefault(""), page: paginationPageParser,
};

export function useMyVerifications() {
  const [state, setState] = useQueryStates(params, { history: "push" });
  const filter: ExpertWorkFilter = { ...state, limit: 10 };
  const query = useQuery({
    queryKey: expertVerificationKeys.workList(filter),
    queryFn: ({ signal }) => expertWorkspaceApi.myWork(filter, signal),
    refetchInterval: 30000,
    retry: false,
  });
  useEffect(() => {
    if (query.data && !query.isFetching && filter.page > query.data.pages) void setState({ page: query.data.pages }, { history: "replace" });
  }, [query.data, query.isFetching, filter.page, setState]);

  function applyFilters(values: Partial<Omit<ExpertWorkFilter, "page" | "limit">>) {
    void setState({ ...values, page: 1 });
  }

  return {
    filter, query, applyFilters,
    resetFilters: () => { void setState(initialFilter); },
    setPage: (page: number) => { void setState({ page }); },
  };
}

export type MyVerificationsController = ReturnType<typeof useMyVerifications>;
