"use client";

import { StatusPage } from "@/components/feedback/status-page";
import { isApiClientError } from "@/lib/api/client";

export function DashboardError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const status = isApiClientError(error) ? error.status : undefined;
  return <StatusPage kind={status === 401 ? "unauthorized" : status === 403 ? "organization" : "error"} onRetry={onRetry} />;
}
