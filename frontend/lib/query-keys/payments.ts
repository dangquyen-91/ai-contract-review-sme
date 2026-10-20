export const paymentKeys = {
  list: (orgId: string) => ["payments", orgId, "list"] as const,
  detail: (orgId: string, code: number) => ["payments", orgId, code] as const,
};
