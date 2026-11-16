export const authMutationKeys = {
  all: ["auth"] as const,
  refresh: ["auth", "refresh"] as const,
  onboardingWorkflow: ["auth", "onboarding-workflow"] as const,
  forgotPassword: ["auth", "forgot-password"] as const,
  resetPassword: ["auth", "reset-password"] as const,
};
