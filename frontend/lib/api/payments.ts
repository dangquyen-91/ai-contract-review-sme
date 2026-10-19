import { apiRequest } from "./client";
import type { PaymentAction, PaymentHistory, PaymentOrder } from "@/types/payment";
import type { PlanCode } from "@/types/subscription";

const base = (orgId: string) => `/organizations/${orgId}/payments`;
export const paymentsApi = {
  list: (orgId: string, page = 1) => apiRequest<PaymentHistory>({ url: base(orgId), params: { page } }),
  get: (orgId: string, code: number) => apiRequest<PaymentOrder>({ url: `${base(orgId)}/${code}` }),
  create: (orgId: string, input: { planCode: PlanCode; action: PaymentAction }, key: string) =>
    apiRequest<PaymentOrder>({ url: base(orgId), method: "POST", data: input, headers: { "Idempotency-Key": key }, timeout: 35_000 }),
  sync: (orgId: string, code: number) => apiRequest<PaymentOrder>({ url: `${base(orgId)}/${code}/sync`, method: "POST", timeout: 35_000 }),
  cancel: (orgId: string, code: number) => apiRequest<PaymentOrder>({ url: `${base(orgId)}/${code}/cancel`, method: "POST", timeout: 35_000 }),
};
