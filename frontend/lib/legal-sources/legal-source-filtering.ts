import type { LegalSource } from "@/types/legal-sources";

export type SourceGroup = "all" | "processing" | "failed" | "coverage";
export type SourceFilters = { status: string; issuingBody: string; issuedFrom: string; issuedTo: string };

export function normalizeLegalSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().trim().replace(/\s+/g, " ");
}

export function matchesSourceGroup(source: LegalSource, group: SourceGroup) {
  if (group === "processing") return ["queued", "running", "paused"].includes(source.ingestion?.status ?? "");
  if (group === "failed") return source.ingestion?.status === "failed";
  if (group === "coverage") return Boolean(source.coverage && (!source.coverage.complete || !source.coverage.structured || source.coverage.warnings?.length));
  return true;
}
