import type { WorkspaceSummary } from "@/types/auth";

export type QuotaKind = "analysis" | "drafting";

const unitNames: Record<QuotaKind, string> = { analysis: "lượt rà soát", drafting: "lượt soạn thảo" };

/** "Starter · còn 18/30 lượt rà soát", or why the workspace cannot be charged. */
export function workspaceQuotaLabel(workspace: WorkspaceSummary, kind: QuotaKind = "analysis") {
  if (workspace.status !== "active" || !workspace.plan)
    return workspace.status === "expired" ? "Gói đã hết hạn" : "Chưa có gói dịch vụ";
  const { available, limit } = workspace[kind];
  return `${workspace.plan.name} · còn ${available}/${limit} ${unitNames[kind]}`;
}
