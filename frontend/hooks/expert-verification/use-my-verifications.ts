"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { expertWorkspaceApi } from "@/lib/api/expert-workspace";
import { expertVerificationKeys } from "@/lib/query-keys/expert-verification";
import type { ExpertWorkFilter } from "@/types/expert-work";

const initialFilter: ExpertWorkFilter = {
  status: "all", search: "", type: "", from: "", to: "", page: 1, limit: 10,
};

export function useMyVerifications() {
  const [filter, setFilter] = useState(initialFilter);
  const query = useQuery({
    queryKey: expertVerificationKeys.workList(filter),
    queryFn: ({ signal }) => expertWorkspaceApi.myWork(filter, signal),
    refetchInterval: 30000,
    retry: false,
  });

  function applyFilters(values: Partial<Omit<ExpertWorkFilter, "page" | "limit">>) {
    setFilter((current) => ({ ...current, ...values, page: 1 }));
  }

  return {
    filter, query, applyFilters,
    resetFilters: () => setFilter(initialFilter),
    setPage: (page: number) => setFilter((current) => ({ ...current, page })),
  };
}

export type MyVerificationsController = ReturnType<typeof useMyVerifications>;
