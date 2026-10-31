export const expertVerificationKeys = {
  queues: ["expert-verification", "queue"] as const,
  queue: (status: string) => ["expert-verification", "queue", status] as const,
  workspace: (reviewId: string, attempt?: number) => ["expert-verification", reviewId, "workspace", ...(attempt ? [attempt] : [])] as const,
  workLists: ["expert-verification", "my-work"] as const,
  workList: (filter: object) => ["expert-verification", "my-work", filter] as const,
  runs: (contractId: string) => ["contracts", contractId, "verification-runs"] as const,
  detail: (reviewId: string) => ["expert-verification", reviewId] as const,
};
