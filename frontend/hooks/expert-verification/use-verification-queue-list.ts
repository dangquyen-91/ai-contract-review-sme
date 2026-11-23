"use client";

import { useEffect } from "react";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { paginationPageParser } from "@/hooks/shared/use-pagination-page";
import { useVerificationQueueFilter } from "./use-verification-queue-filter";
import { useVerificationQueue } from "./use-verification-workspace";
import { filterVerificationQueue } from "@/lib/review/verification-queue-list";
import type { VerificationQueueFilter } from "@/types/verification-workspace";

const params = {
  queuePage: paginationPageParser,
  queueSearch: parseAsString.withDefault(""),
  queueType: parseAsString.withDefault(""),
  queueSort: parseAsStringLiteral(["oldest", "newest"] as const).withDefault(
    "oldest",
  ),
};
export function useVerificationQueueList(initial: VerificationQueueFilter) {
  const [status, changeStatus] = useVerificationQueueFilter(initial);
  const [filter, setFilter] = useQueryStates(params, { history: "push" });
  const query = useVerificationQueue(status);
  const filteredRows = filterVerificationQueue(
    query.data ?? [],
    filter.queueSearch,
    filter.queueType,
    filter.queueSort,
  );
  const pageSize = 10;
  const total = filteredRows.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(filter.queuePage, pages);
  const rows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (query.data && !query.isFetching && filter.queuePage > pages) {
      void setFilter({ queuePage: pages }, { history: "replace" });
    }
  }, [query.data, query.isFetching, filter.queuePage, pages, setFilter]);

  return {
    query,
    rows,
    total,
    pages,
    page,
    pageSize,
    status,
    setStatus: (value: VerificationQueueFilter) => {
      void setFilter({ queuePage: 1 });
      return changeStatus(value);
    },
    filter,
    setFilter: (
      values: Partial<
        Pick<typeof filter, "queueSearch" | "queueType" | "queueSort">
      >,
    ) => {
      return setFilter({ ...values, queuePage: 1 });
    },
    setPage: (value: number) => {
      void setFilter({ queuePage: Math.max(1, Math.min(value, pages)) });
    },
    reset: () => {
      void setFilter({
        queueSearch: "",
        queueType: "",
        queueSort: "oldest",
        queuePage: 1,
      });
    },
  };
}
export type VerificationQueueList = ReturnType<typeof useVerificationQueueList>;
