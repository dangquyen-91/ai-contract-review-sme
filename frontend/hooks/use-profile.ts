"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '@/lib/api/profile';
import { dashboardKeys } from '@/lib/query-keys/dashboard';
import type { Profile } from '@/types/profile';

export const profileKey = ['account-profile'] as const;
export function useProfile() {
  return useQuery({ queryKey: profileKey, queryFn: profileApi.get, retry: false });
}
export function useProfileUpdates() {
  const client = useQueryClient();
  async function saved(profile: Profile) {
    client.setQueryData(profileKey, profile);
    await client.invalidateQueries({ queryKey: dashboardKeys.all });
  }
  const update = useMutation({ mutationFn: profileApi.update, onSuccess: saved });
  const avatar = useMutation({ mutationFn: profileApi.avatar, onSuccess: saved });
  const removeAvatar = useMutation({ mutationFn: profileApi.removeAvatar, onSuccess: saved });
  return { update, avatar, removeAvatar };
}
