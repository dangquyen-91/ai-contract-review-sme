import type { AiJobFilters, AuditFilters } from "@/types/admin-operations";

export const adminOperationKeys = {
  aiJobs: ["admin", "ai-jobs"] as const,
  aiOverview: () => [...adminOperationKeys.aiJobs, "overview"] as const,
  aiJobList: (page: number, limit: number, filters: AiJobFilters) => [...adminOperationKeys.aiJobs, "list", page, limit, filters] as const,
  auditLog: (page: number, limit: number, filters: AuditFilters) => ["admin", "audit-log", page, limit, filters] as const,
};
