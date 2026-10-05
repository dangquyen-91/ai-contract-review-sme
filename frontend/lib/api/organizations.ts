import { apiRequest } from "@/lib/api/client";
import type { CreateOrganizationInput, Organization } from "@/types/organization";

export const organizationsApi = {
  create(input: CreateOrganizationInput) {
    return apiRequest<Organization>({
      url: "/organizations",
      method: "POST",
      data: input,
    });
  },
};
