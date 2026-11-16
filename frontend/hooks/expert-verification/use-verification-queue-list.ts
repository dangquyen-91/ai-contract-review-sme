"use client";

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useVerificationQueueFilter } from "./use-verification-queue-filter";
import { useVerificationQueue } from "./use-verification-workspace";
import { filterVerificationQueue } from "@/lib/review/verification-queue-list";
import type { VerificationQueueFilter } from "@/types/verification-workspace";

const params = {
  queueSearch: parseAsString.withDefault(""),
  queueType: parseAsString.withDefault(""),
  queueSort: parseAsStringLiteral(["oldest", "newest"] as const).withDefault(
    "oldest",
  ),
};
export function useVerificationQueueList(initial: VerificationQueueFilter) {
  const [status, setStatus] = useVerificationQueueFilter(initial);
  const [filter, setFilter] = useQueryStates(params, { history: "push" });
  const query = useVerificationQueue(status);
  const rows = filterVerificationQueue(
    query.data ?? [],
    filter.queueSearch,
    filter.queueType,
    filter.queueSort,
  );
  return {
    query,
    rows,
    status,
    setStatus,
    filter,
    setFilter,
    reset: () => {
      void setFilter({ queueSearch: "", queueType: "", queueSort: "oldest" });
    },
  };
}
export type VerificationQueueList = ReturnType<typeof useVerificationQueueList>;
