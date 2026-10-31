export const expertVerificationKeys = {
  runs: (contractId: string) => ["contracts", contractId, "verification-runs"] as const,
  detail: (reviewId: string) => ["expert-verification", reviewId] as const,
};
