"use client";

import { useQuery } from "@tanstack/react-query";
import { organizationsApi } from "@/lib/api/organizations";
import { organizationKeys } from "@/lib/query-keys/organizations";

export function useVietnamAddresses() {
  return useQuery({
    queryKey: organizationKeys.addressOptions,
    queryFn: organizationsApi.addressOptions,
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
