import { apiClient, apiRequest } from "@/lib/api/client";
import type { AdminHealth, LegalSource } from "@/types/legal-sources";

export const legalSourcesApi = {
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
