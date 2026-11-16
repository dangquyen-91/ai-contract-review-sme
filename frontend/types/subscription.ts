export const planCodes = ["personal_free", "personal_pro", "business_starter", "business_pro"] as const;
export type PlanCode = typeof planCodes[number];
export type PlanAudience = "personal" | "business";

export type SubscriptionPlan = {
  code: PlanCode;
  name: string;
  audience: PlanAudience;
  price: number;
  currency: "VND";
  analysisLimit: number;
  draftingLimit: number;
  chatLimit: number;
  memberLimit: number;
};

// `limit` includes purchased top-up units (`bonus`) on top of the plan's own `planLimit`.
export type UsageCounter = {
  used: number;
  reserved: number;
  limit: number;
  available: number;
  planLimit?: number;
  bonus?: number;
};

export type UsageKind = "analysis" | "chat" | "drafting";
export type TopUpPack = {
  code: string;
  name: string;
  audience: PlanAudience;
  kind: UsageKind;
  units: number;
  price: number;
  currency: "VND";
};

export type OrganizationSubscription = {
  status: string;
  plan: SubscriptionPlan | null;
  startsAt: string | null;
  endsAt: string | null;
  scheduledDowngrade: { planCode: PlanCode; effectiveAt: string } | null;
  // Paid periods that start after the current one (renewals, a paid downgrade).
  futurePeriods?: { plan: SubscriptionPlan; startsAt: string; endsAt: string }[];
  members: { count: number; pending: number; limit: number; available: number };
  analysis: UsageCounter;
  chat: UsageCounter;
  drafting: UsageCounter;
  reviewPagesPerUnit: number;
  contractReviewPricing?: { unitPrice: number; pagesPerUnit: number };
};
