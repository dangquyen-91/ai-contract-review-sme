"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invitationsApi } from "@/lib/api/invitations";
import type { CreateInvitationInput } from "@/types/invitations";

import { invitationKeys } from "@/lib/query-keys/invitations";
import { isApiClientError } from "@/lib/api/client";
import { dashboardKeys } from "@/lib/query-keys/dashboard";
import { clearSessionCache } from "@/lib/session-cache";

export function useReceivedInvitations() {
  return useQuery({
    queryKey: invitationKeys.received,
    queryFn: ({ signal }) => invitationsApi.received(signal),
    retry: false,
    refetchInterval: 60_000,
  });
}

export function useAcceptReceivedInvitationMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: invitationsApi.acceptReceived,
    retry: false,
    onSuccess: () => clearSessionCache(client),
  });
}

export function useDeclineReceivedInvitationMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: invitationsApi.declineReceived,
    retry: false,
    onSuccess: () => client.invalidateQueries({ queryKey: invitationKeys.received }),
  });
}


export function useOrganizationMembers(orgId: string, page: number) {
  return useQuery({ queryKey: invitationKeys.members(orgId, page), queryFn: () => invitationsApi.members(orgId, page), retry: false });
}

export function useRemoveMemberMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => invitationsApi.removeMember(orgId, userId),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: invitationKeys.membersBase(orgId) }),
      queryClient.invalidateQueries({ queryKey: invitationKeys.invitationsBase(orgId) }),
      queryClient.invalidateQueries({ queryKey: invitationKeys.subscription(orgId) }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
    ]),
  });
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
      if (isApiClientError(error) && error.status === 403 && (error.serverCode === 'MEMBER_LIMIT_REACHED' || /^Member limit reached\b|^Đã đạt giới hạn thành viên/i.test(error.message))) {
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
