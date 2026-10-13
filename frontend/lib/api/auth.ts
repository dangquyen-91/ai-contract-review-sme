import { apiRequest, refreshSession } from "@/lib/api/client";
import type { AuthSession, LoginInput, LogoutResult, RegisterInput } from "@/types/auth";

export const authApi = {
  login(input: LoginInput) {
    return apiRequest<AuthSession>({
      url: "/auth/login",
      method: "POST",
      data: input,
    });
  },

  register(input: RegisterInput) {
    return apiRequest<AuthSession>({
      url: "/auth/register",
      method: "POST",
      data: input,
    });
  },

  refreshToken() {
    return refreshSession();
  },

  completeOnboarding() {
    return apiRequest<AuthSession>({
      url: "/auth/onboarding",
      method: "POST",
    });
  },

  logout() {
    return apiRequest<LogoutResult>({
      url: "/auth/logout",
      method: "POST",
    });
  },
};
