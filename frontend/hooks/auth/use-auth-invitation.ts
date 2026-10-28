"use client";

import { useQuery } from "@tanstack/react-query";
import { invitationsApi } from "@/lib/api/invitations";
import { invitationError } from "@/lib/invitations/invitation-error";
import { invitationKeys } from "@/lib/query-keys/invitations";

export function useAuthInvitation(invitationToken?: string) {
  const hasInvitation = invitationToken !== undefined;
  const validToken = Boolean(
    invitationToken && /^[a-f\d]{64}$/.test(invitationToken),
  );
  const preview = useQuery({
    queryKey: invitationKeys.preview(invitationToken ?? ""),
    queryFn: () => invitationsApi.preview(invitationToken!),
    enabled: hasInvitation && validToken,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });
  return {
    hasInvitation,
    validToken,
    preview,
    failure: invitationError(preview.error),
  };
}
