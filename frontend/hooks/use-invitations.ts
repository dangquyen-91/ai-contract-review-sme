"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invitationsApi } from "@/lib/api/invitations";
import type { CreateInvitationInput } from "@/types/invitations";

import { invitationKeys } from "@/lib/query-keys/invitations";
import { isApiClientError } from "@/lib/api/client";


export function useOrganizationMembers(orgId: string, page: number) {
  return useQuery({ queryKey: invitationKeys.members(orgId, page), queryFn: () => invitationsApi.members(orgId, page), retry: false });
}

export function useOrganizationInvitations(orgId: string, page: number) {
  return useQuery({ queryKey: invitationKeys.invitations(orgId, page), queryFn: () => invitationsApi.invitations(orgId, page), retry: false });
}

export function useMemberSubscription(orgId: string) {
  return useQuery({ queryKey: invitationKeys.subscription(orgId), queryFn: () => invitationsApi.subscription(orgId), retry: false });
}

export function useInvitationPreview(token: string, enabled: boolean) {
  return useQuery({ queryKey: invitationKeys.preview(token), queryFn: () => invitationsApi.preview(token), enabled, retry: false });
}

export function useCreateInvitationMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvitationInput) => invitationsApi.create(orgId, input),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: invitationKeys.invitationsBase(orgId) }),
      queryClient.invalidateQueries({ queryKey: invitationKeys.subscription(orgId) }),
    ]),
    onError: (error) => {
      if (isApiClientError(error) && error.status === 403 && /^Member limit reached\b/i.test(error.message)) {
        return queryClient.invalidateQueries({ queryKey: invitationKeys.subscription(orgId) });
      }
    },
  });
}

export function useRevokeInvitationMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => invitationsApi.revoke(orgId, invitationId),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: invitationKeys.invitationsBase(orgId) }),
      queryClient.invalidateQueries({ queryKey: invitationKeys.subscription(orgId) }),
    ]),
  });
}

export function useAcceptInvitationMutation() {
  return useMutation({ mutationFn: (token: string) => invitationsApi.accept(token) });
}
