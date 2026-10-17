import { apiClient, apiRequest } from "@/lib/api/client";
import type { AdminHealth, LegalSource, LegalSourcePreview } from "@/types/legal-sources";

export const legalSourcesApi = {
  detail(id: string, signal?: AbortSignal) {
    return apiRequest<LegalSource>({ url: `/admin/legal-sources/${encodeURIComponent(id)}`, signal });
  },
  preview(data: FormData) {
    return apiRequest<LegalSourcePreview>({ url: "/admin/legal-sources/preview", method: "POST", data, timeout: 190_000 });
  },
  appendPart(id: string, data: FormData) {
    return apiRequest<LegalSource>({ url: `/admin/legal-sources/${encodeURIComponent(id)}/parts`, method: "POST", data, timeout: 190_000 });
  },
  resume(id: string) {
    return apiRequest<LegalSource>({ url: `/admin/legal-sources/${encodeURIComponent(id)}/resume`, method: "POST", timeout: 190_000 });
  },
  list() {
    return apiRequest<LegalSource[]>({ url: "/admin/legal-sources" });
  },
  health() {
    return apiRequest<AdminHealth>({ url: "/admin/health" });
  },
  async create(body: FormData) {
    const response = await apiClient.post<{ success: true; data: LegalSource }>("/admin/legal-sources", body, { timeout: 190_000 });
    return response.data.data;
  },
  async remove(id: string) {
    await apiClient.delete(`/admin/legal-sources/${encodeURIComponent(id)}`, { timeout: 190_000 });
  },
};
