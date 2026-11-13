import type { ContractVersionSummary } from "@/types/contracts";

export const LOW_VERSION_SIMILARITY = 0.2;

export function similarityPercent(version: ContractVersionSummary) {
  return typeof version.similarityToPrevious === "number" ? Math.round(version.similarityToPrevious * 100) : null;
}

export function isLikelyWrongContract(version: ContractVersionSummary) {
  return typeof version.similarityToPrevious === "number" && version.similarityToPrevious < LOW_VERSION_SIMILARITY;
}

export function canDetachVersion(version: ContractVersionSummary, versionCount: number) {
  return version.isCurrent && versionCount > 1 && !version.latestReview;
}
