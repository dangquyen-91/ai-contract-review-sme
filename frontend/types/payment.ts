import type { PlanCode, UsageKind } from "./subscription";

export type PaymentAction = "purchase" | "renew" | "upgrade" | "downgrade";
export type PaymentOrder = {
  orderCode: number;
  orgId: string;
  planCode?: PlanCode | null;
  purpose?: "subscription" | "contract_review" | "top_up";
  packCode?: string | null;
  topUpKind?: UsageKind | null;
  topUpUnits?: number | null;
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
  // Chat questions about this contract included with a new purchase, and what earlier purchases have left.
  // An abandoned unpaid order that a new checkout will cancel.
  replacesOrderCode?: number | null;
  includedChat?: number;
  // Units already paid for an earlier version of this contract; `amount` covers only the rest.
  paidUnits?: number;
  // Remaining plan units this review will use, and the units left to pay.
  planUnits?: number;
  shortfallUnits?: number;
  carryPurchaseId?: string | null;
  contractChat?: { allowance: number; used: number; reserved: number; available: number };
};
