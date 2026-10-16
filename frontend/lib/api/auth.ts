import { apiRequest } from "@/lib/api/client";
import type { AuthResult, AuthSession, EmailVerificationChallenge, LoginInput, LogoutResult, RefreshTokenResult, RegisterInput } from "@/types/auth";

export const authApi = {
  google(input: { credential: string; nonce: string; remember?: boolean; invitationToken?: string }) {
    return apiRequest<AuthSession>({ url: "/auth/google", method: "POST", data: input });
  },
  login(input: LoginInput) {
    return apiRequest<AuthResult>({
      url: "/auth/login",
      timeout: 30_000,
      method: "POST",
      data: input,
    });
  },

  register(input: RegisterInput) {
    return apiRequest<AuthResult>({
      url: "/auth/register",
      timeout: 30_000,
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
  verifyEmail(input: { challengeId: string; code: string; invitationToken?: string }) {
    return apiRequest<AuthSession>({ url: "/auth/verify-email", method: "POST", data: input });
  },
  resendVerification(input: { challengeId: string; invitationToken?: string }) {
    return apiRequest<EmailVerificationChallenge>({ url: "/auth/resend-verification", timeout: 30_000, method: "POST", data: input });
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
