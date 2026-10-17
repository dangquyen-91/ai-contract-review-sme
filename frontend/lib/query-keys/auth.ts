export const authMutationKeys = {
  all: ["auth"] as const,
  refresh: ["auth", "refresh"] as const,
  onboardingWorkflow: ["auth", "onboarding-workflow"] as const,
};
