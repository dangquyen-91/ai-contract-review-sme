import { apiRequest } from "@/lib/api/client";
import type { AuthSession, LoginInput, RefreshTokenResult, RegisterInput } from "@/types/auth";

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
    return apiRequest<RefreshTokenResult>({
      url: "/auth/refresh",
      method: "POST",
    });
  },

  logout() {
    return apiRequest<{ loggedOut: true }>({
      url: "/auth/logout",
      method: "POST",
    });
  },
};
