"use client";

import { useMutation } from "@tanstack/react-query";
import { organizationsApi } from "@/lib/api/organizations";
import type { ApiClientError } from "@/lib/api/client";
import type { CreateOrganizationInput, Organization } from "@/types/organization";

import { organizationMutationKeys } from "@/lib/query-keys/organizations";


export function useCreateOrganizationMutation() {
  return useMutation<Organization, ApiClientError, CreateOrganizationInput>({
    mutationKey: organizationMutationKeys.create,
    mutationFn: (input) => organizationsApi.create(input),
  });
}
