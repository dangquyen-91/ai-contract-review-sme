export const authQueryKeys = {
  workspaceSession: ["workspace-session"] as const,
  workspaces: ["workspace-session", "workspaces"] as const,
};

export const authMutationKeys = {
  all: ["auth"] as const,
  refresh: ["auth", "refresh"] as const,
  onboardingWorkflow: ["auth", "onboarding-workflow"] as const,
  forgotPassword: ["auth", "forgot-password"] as const,
  resetPassword: ["auth", "reset-password"] as const,
};
