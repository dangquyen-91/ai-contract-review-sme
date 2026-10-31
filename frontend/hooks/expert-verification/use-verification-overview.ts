"use client";

import { useVerificationQueue } from "./use-verification-workspace";

export function useVerificationOverview() {
  // Separate queries prevent a long shared waiting queue from hiding this
  // expert's in-progress work inside the backend's 100-item limit.
  const assigned = useVerificationQueue("in_progress");
  const waiting = useVerificationQueue("requested");
  const refreshing = assigned.isFetching || waiting.isFetching;
  const updatedAt = assigned.dataUpdatedAt && waiting.dataUpdatedAt
    ? Math.min(assigned.dataUpdatedAt, waiting.dataUpdatedAt) : null;

  function refresh() {
    return Promise.allSettled([assigned.refetch(), waiting.refetch()]);
  }

  return { assigned, waiting, refreshing, updatedAt, refresh };
}
