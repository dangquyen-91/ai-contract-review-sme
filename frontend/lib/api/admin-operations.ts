import { apiClient, apiRequest } from "./client";
import type { AiJob, AiJobFilters, AiJobList, AiJobOverview, AuditEvent, AuditEventList, AuditFilters } from "@/types/admin-operations";

type Page<T> = { data: T[]; meta: { page: number; limit: number; total: number; totalPages: number } };
// Empty filters stay out of the address the backend sees.
const present = (filters: Record<string, string>) => Object.fromEntries(Object.entries(filters).filter(([, value]) => value));

export const adminOperationsApi = {
  aiOverview: (signal?: AbortSignal) => apiRequest<AiJobOverview>({ url: "/admin/ai-jobs/overview", signal }),
  async aiJobs(page: number, limit: number, filters: AiJobFilters, signal?: AbortSignal): Promise<AiJobList> {
    const response = await apiClient.get<Page<AiJob>>("/admin/ai-jobs", { params: { page, limit, ...present(filters) }, signal });
    return { items: response.data.data, ...response.data.meta };
  },
  cancelAiJob: (id: string) =>
    apiRequest<{ id: string; status: AiJob["status"] | null }>({ url: `/admin/ai-jobs/${id}/cancel`, method: "POST" }),
  async auditLog(page: number, limit: number, filters: AuditFilters, signal?: AbortSignal): Promise<AuditEventList> {
    const response = await apiClient.get<Page<AuditEvent>>("/admin/audit-log", { params: { page, limit, ...present(filters) }, signal });
    return { items: response.data.data, ...response.data.meta };
  },
};
