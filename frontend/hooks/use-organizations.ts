"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardKeys } from "@/lib/query-keys/dashboard";
import { organizationsApi } from "@/lib/api/organizations";
import type { ApiClientError } from "@/lib/api/client";
import type { CreateOrganizationInput, Organization, OrganizationListFilters } from "@/types/organization";

import { organizationKeys, organizationMutationKeys } from "@/lib/query-keys/organizations";

export function useOrganizationsList(page: number, limit = 20, filters: OrganizationListFilters = {}) {
  return useQuery({
    queryKey: organizationKeys.list(page, limit, filters),
    queryFn: ({ signal }) => organizationsApi.list(page, limit, signal, filters),
    retry: false,
  });
}

export function useUpdateOrganization(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof organizationsApi.update>[1]) => organizationsApi.update(id, input),
    onSuccess: () => client.invalidateQueries({ queryKey: dashboardKeys.all }),
  });
}

export function useUpdateOrganizationIndustry(id: string) {
  const client = useQueryClient();
  return useMutation<Organization, ApiClientError, string | null>({
    mutationFn: (industry) => organizationsApi.updateIndustry(id, industry),
    onSuccess: () => client.invalidateQueries({ queryKey: dashboardKeys.all }),
  });
}

export function useDeleteOrganization(id: string) {
  return useMutation({ mutationFn: () => organizationsApi.remove(id) });
}


export function useCreateOrganizationMutation() {
  return useMutation<Organization, ApiClientError, CreateOrganizationInput>({
    mutationKey: organizationMutationKeys.create,
    mutationFn: (input) => organizationsApi.create(input),
  });
}
