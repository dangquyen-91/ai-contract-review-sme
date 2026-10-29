import type { PlanCode } from "./subscription";

export type PaymentAction = "purchase" | "renew" | "upgrade" | "downgrade";
export type PaymentOrder = {
  orderCode: number;
  orgId: string;
  planCode?: PlanCode;
  purpose?: "subscription" | "contract_review";
  contractId?: string | null;
  versionId?: string | null;
  pageCount?: number | null;
  reviewUnits?: number | null;
  action: PaymentAction;
  amount: number;
  currency: "VND";
  status: "creating" | "pending" | "paid" | "cancelled" | "expired" | "failed";
  checkoutUrl: string | null;
  qrCode: string | null;
  expiresAt: string;
  paidAt: string | null;
  fulfilledAt: string | null;
  fulfillmentError: string | null;
  providerError: string | null;
};
export type PaymentHistory = { items: PaymentOrder[]; page: number; pageSize: number };
export type ContractReviewQuote = {
  contractId: string; versionId: string; pageCount: number; units: number;
  amount: number; unitPrice: number; currency: "VND"; availableUnits: number; canPurchase: boolean;
  purchaseStatus: "available" | "reserved" | "consumed" | null; openOrderCode: number | null;
};
