import { apiRequest } from "./client";
import type { PaymentAction, PaymentHistory, PaymentOrder, ContractReviewQuote } from "@/types/payment";
import type { PlanCode } from "@/types/subscription";

const base = (orgId: string) => `/organizations/${orgId}/payments`;
export const paymentsApi = {
  reviewQuote: (contractId: string) => apiRequest<ContractReviewQuote>({ url: `/contracts/${contractId}/review-payment` }),
  createReview: (accountId: string, quote: ContractReviewQuote, key: string) => apiRequest<PaymentOrder>({
    url: base(accountId), method: "POST", data: { purpose: "contract_review", action: "purchase", contractId: quote.contractId, versionId: quote.versionId, expectedAmount: quote.amount },
    headers: { "Idempotency-Key": key }, timeout: 35_000,
  }),
  list: (orgId: string, page = 1) => apiRequest<PaymentHistory>({ url: base(orgId), params: { page } }),
  get: (orgId: string, code: number) => apiRequest<PaymentOrder>({ url: `${base(orgId)}/${code}` }),
  create: (orgId: string, input: { planCode: PlanCode; action: PaymentAction }, key: string) =>
    apiRequest<PaymentOrder>({ url: base(orgId), method: "POST", data: input, headers: { "Idempotency-Key": key }, timeout: 35_000 }),
  sync: (orgId: string, code: number) => apiRequest<PaymentOrder>({ url: `${base(orgId)}/${code}/sync`, method: "POST", timeout: 35_000 }),
  cancel: (orgId: string, code: number) => apiRequest<PaymentOrder>({ url: `${base(orgId)}/${code}/cancel`, method: "POST", timeout: 35_000 }),
};
