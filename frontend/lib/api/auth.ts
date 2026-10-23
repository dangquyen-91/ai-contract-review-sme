import { apiRequest, refreshSession } from "@/lib/api/client";
import type { AuthResult, AuthSession, EmailVerificationChallenge, LoginInput, LogoutResult, RegisterInput } from "@/types/auth";

export const authApi = {
  forgotPassword(email: string) {
    return apiRequest<{ challengeId: string; expiresAt: string; resendAfterSeconds: number; message: string }>({ url: "/auth/forgot-password", timeout: 30_000, method: "POST", data: { email } });
  },
  resetPassword(input: { challengeId: string; code: string; password: string }) {
    return apiRequest<{ reset: boolean }>({ url: "/auth/reset-password", timeout: 30_000, method: "POST", data: input });
  },
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
    return refreshSession();
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
