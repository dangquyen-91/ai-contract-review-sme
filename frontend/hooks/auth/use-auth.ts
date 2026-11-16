"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clearSessionCache } from "@/lib/auth/session-cache";
import { disableGoogleAutoSelect } from "@/lib/auth/google-sign-out";
import { authApi } from "@/lib/api/auth";
import type { ApiClientError } from "@/lib/api/client";
import type { AuthMutationVariables, AuthResult, AuthSession, RefreshTokenResult } from "@/types/auth";

import { authMutationKeys } from "@/lib/query-keys/auth";


export function useAuthMutation() {
  const queryClient = useQueryClient();
  return useMutation<AuthResult, ApiClientError, AuthMutationVariables>({
    mutationKey: authMutationKeys.all,
    mutationFn: ({ mode, data }) => (
      mode === "login" ? authApi.login(data) : authApi.register(data)
    ),
    onSuccess: () => clearSessionCache(queryClient),
  });
}

export function useRefreshTokenMutation() {
  return useMutation<RefreshTokenResult, ApiClientError, void>({
    mutationKey: authMutationKeys.refresh,
    mutationFn: () => authApi.refreshToken(),
  });
}

export function useCompleteOnboardingMutation() {
  return useMutation<AuthSession, ApiClientError, void>({
    mutationFn: () => authApi.completeOnboarding(),
  });
}

export function useLogoutMutation() {
  return useMutation({ mutationFn: () => authApi.logout(), onSuccess: disableGoogleAutoSelect });
}
