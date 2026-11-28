"use client";

import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { authQueryKeys } from "@/lib/query-keys/auth";

/**
 * The organization the signed-in account belongs to, whichever workspace is open.
 * `undefined` while loading. Shares its cache with the workspace switcher.
 */
export function useOrganizationMembership() {
  const session = useQuery({
    queryKey: authQueryKeys.workspaceSession,
    queryFn: authApi.workspaceSession,
    staleTime: 30_000,
    retry: false,
  });
  return session.data ? (session.data.organizationMembership ?? null) : undefined;
}
