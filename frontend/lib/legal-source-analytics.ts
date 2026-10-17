import type { LegalSource } from "@/types/legal-sources";
import { matchesSourceGroup } from "@/lib/legal-source-filtering";
import { ingestionStatuses, legalSourceTypes } from "@/config/legal-source-display";

export function getLegalSourceAnalytics(sources: LegalSource[]) {
  const types = Object.entries(legalSourceTypes).map(([key, label]) => ({
    key, label, count: sources.filter((source) => source.sourceType === key).length,
  }));
  const processing = [...Object.entries(ingestionStatuses), ["unknown", "Chưa có trạng thái"]].map(([key, label]) => ({
    key, label, count: sources.filter((source) => (source.ingestion?.status ?? "unknown") === key).length,
  }));
  const attention = sources.filter((source) => matchesSourceGroup(source, "failed") || matchesSourceGroup(source, "coverage") || source.ingestion?.status === "paused")
    .sort((left, right) => Number(right.ingestion?.status === "failed") - Number(left.ingestion?.status === "failed"));
  return { types, processing, attention };
}
