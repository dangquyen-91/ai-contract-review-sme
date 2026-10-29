import { apiClient, apiRequest } from "@/lib/api/client";
import type { CreateOrganizationInput, Organization, OrganizationListFilters, OrganizationListResult, VietnamAddressDirectory } from "@/types/organization";

export const organizationsApi = {
  addressOptions: () => apiRequest<VietnamAddressDirectory>({ url: '/organizations/address-options' }),
  async list(page = 1, limit = 20, signal?: AbortSignal, filters: OrganizationListFilters = {}): Promise<OrganizationListResult> {
    const response = await apiClient.get<{
      data: Organization[];
      meta: Omit<OrganizationListResult, "items">;
    }>("/organizations", { params: { page, limit, ...filters }, signal });
    return { items: response.data.data, ...response.data.meta };
  },
  update(id: string, input: { name: string; taxCode: string | null; address: string | null }) {
    return apiRequest<Organization>({ url: `/organizations/${id}`, method: "PATCH", data: input });
  },
  updateIndustry(id: string, industry: string | null) {
    return apiRequest<Organization>({ url: `/organizations/${id}`, method: "PATCH", data: { industry } });
  },
  remove(id: string) {
    return apiRequest<void>({ url: `/organizations/${id}`, method: "DELETE" });
  },
  create(input: CreateOrganizationInput) {
    return apiRequest<Organization>({
      url: "/organizations",
      method: "POST",
      data: input,
    });
  },
};
