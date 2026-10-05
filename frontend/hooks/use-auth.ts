"use client";

import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import type { ApiClientError } from "@/lib/api/client";
import type { AuthMutationVariables, AuthSession, RefreshTokenResult } from "@/types/auth";

export const authMutationKeys = {
  all: ["auth"] as const,
  refresh: ["auth", "refresh"] as const,
};

export function useAuthMutation() {
  return useMutation<AuthSession, ApiClientError, AuthMutationVariables>({
    mutationKey: authMutationKeys.all,
    mutationFn: ({ mode, data }) => (
      mode === "login" ? authApi.login(data) : authApi.register(data)
    ),
  });
}

export function useRefreshTokenMutation() {
  return useMutation<RefreshTokenResult, ApiClientError, void>({
    mutationKey: authMutationKeys.refresh,
    mutationFn: () => authApi.refreshToken(),
  });
}
