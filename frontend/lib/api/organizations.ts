import { apiRequest } from "@/lib/api/client";
import type { CreateOrganizationInput, Organization } from "@/types/organization";

export const organizationsApi = {
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
