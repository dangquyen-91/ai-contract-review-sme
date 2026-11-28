import type { ManagedPaymentFilters } from "@/types/payment";

export const paymentKeys = {
  list: (orgId: string) => ["payments", orgId, "list"] as const,
  detail: (orgId: string, code: number) => ["payments", orgId, code] as const,
  managed: (page: number, limit: number, filters: ManagedPaymentFilters) => ["payments", "managed", page, limit, filters] as const,
};
