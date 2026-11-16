import type { DashboardContract } from "@/types/contracts";

export type ConfirmationView = "reading" | "extraction_failed" | "classifying" | "classify_failed" | "blocked" | "ready";

export const LOW_CONFIDENCE = 0.7;

export function extractionFailureCopy(contract: DashboardContract) {
  const version = contract.currentVersion;
  if (version?.extractionErrorCode === "REVIEW_PAGE_COUNT_UNAVAILABLE" || version?.extractionError?.includes("LibreOffice")) {
    return {
      title: "Chưa đếm được số trang Word",
      message: "Tệp đã tải lên nhưng máy chủ chưa xử lý được số trang Word. Hãy tải bản PDF hoặc thử lại sau khi hệ thống được cấu hình. Bạn chưa bị trừ lượt nào.",
    };
  }
  return {
    title: "Không đọc được nội dung tệp",
    message: "Hãy tải lên tệp rõ hơn hoặc ở định dạng khác. Bạn chưa bị trừ lượt nào.",
  };
}

export function isAwaitingClassification(contract?: DashboardContract) {
  if (!contract) return false;
  if (contract.currentVersion?.extractionStatus === "processing") return true;
  const status = contract.classification?.status;
  return !contract.type && (status === "pending" || status === "running");
}

export function confirmationView(contract: DashboardContract): ConfirmationView {
  if (contract.type) return "ready";
  const extraction = contract.currentVersion?.extractionStatus;
  if (extraction === "processing" || extraction === "pending") return "reading";
  if (extraction === "failed" || extraction === "unsupported") return "extraction_failed";
  const classification = contract.classification;
  if (!classification || classification.status === "pending" || classification.status === "running") return "classifying";
  if (classification.status === "failed") return "classify_failed";
  return classification.outcome && classification.outcome !== "supported" ? "blocked" : "ready";
}

export function suggestedProfile(contract: DashboardContract, allowedTypes: string[]) {
  const type = contract.type ?? contract.classification?.type;
  if (!type || !allowedTypes.includes(type)) return { type: undefined, ourParty: undefined };
  return { type, ourParty: contract.ourParty ?? contract.classification?.ourParty };
}

export function detectedNamesFor(contract: DashboardContract, partyCode?: string) {
  if (!partyCode) return [];
  return (contract.classification?.parties ?? []).filter((party) => party.partyCode === partyCode).map((party) => party.name);
}

export function otherPartyNames(contract: DashboardContract, partyCode?: string) {
  return (contract.classification?.parties ?? []).filter((party) => !partyCode || party.partyCode !== partyCode).map((party) => party.name);
}
