"use client";

import { useState } from "react";
import type { VerificationAction } from "@/types/verification-workspace";

export type HistoryActionFilter = "all" | VerificationAction["action"];
export type HistoryAttemptFilter = "all" | number;
const pageSize = 10;

export function useVerificationHistory(history: VerificationAction[]) {
  const [filter, setFilter] = useState<{
    action: HistoryActionFilter;
    attempt: HistoryAttemptFilter;
    limit: number;
  }>({ action: "all", attempt: "all", limit: pageSize });
  const attempts = [...new Set(history.map((item) => item.attempt))].sort(
    (left, right) => right - left,
  );
  const filtered = history
    .filter(
      (item) =>
        (filter.action === "all" || item.action === filter.action) &&
        (filter.attempt === "all" || item.attempt === filter.attempt),
    )
    .sort((left, right) => {
      const time =
        (Date.parse(right.createdAt) || 0) - (Date.parse(left.createdAt) || 0);
      return time || right._id.localeCompare(left._id);
    });

  function applyFilters(
    values: Partial<Pick<typeof filter, "action" | "attempt">>,
  ) {
    setFilter((current) => ({ ...current, ...values, limit: pageSize }));
  }

  return {
    filter,
    attempts,
    items: filtered.slice(0, filter.limit),
    total: filtered.length,
    remaining: Math.max(0, filtered.length - filter.limit),
    nextCount: Math.min(pageSize, Math.max(0, filtered.length - filter.limit)),
    applyFilters,
    reset: () => setFilter({ action: "all", attempt: "all", limit: pageSize }),
    showMore: () =>
      setFilter((current) => ({ ...current, limit: current.limit + pageSize })),
  };
}

export type VerificationHistoryController = ReturnType<
  typeof useVerificationHistory
>;
