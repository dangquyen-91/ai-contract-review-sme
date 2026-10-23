import { apiClient, apiRequest } from "@/lib/api/client";
import type { CreateManagedUserInput, ManagedUser, ManagedUserList, UpdateManagedUserInput, UserListParams } from "@/types/user-management";

const endpoint = "/admin/users";

export const userManagementApi = {
  list({ role, status, ...params }: UserListParams, signal?: AbortSignal) {
    return apiRequest<ManagedUserList>({
      url: endpoint,
      params: { ...params, ...(role ? { role } : {}), ...(status ? { status } : {}) },
      signal,
    });
  },
  detail(id: string, signal?: AbortSignal) {
    return apiRequest<ManagedUser>({ url: `${endpoint}/${encodeURIComponent(id)}`, signal });
  },
  create(data: CreateManagedUserInput) {
    return apiRequest<ManagedUser>({ url: endpoint, method: "POST", data });
  },
  update(id: string, data: UpdateManagedUserInput) {
    return apiRequest<ManagedUser>({ url: `${endpoint}/${encodeURIComponent(id)}`, method: "PATCH", data });
  },
  async remove(id: string) {
    await apiClient.delete(`${endpoint}/${encodeURIComponent(id)}`);
  },
};
