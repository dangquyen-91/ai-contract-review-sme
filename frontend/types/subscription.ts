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

export type OrganizationSubscription = {
  status: string;
  plan: SubscriptionPlan | null;
  startsAt: string | null;
  endsAt: string | null;
  scheduledDowngrade: { planCode: PlanCode; effectiveAt: string } | null;
  members: { count: number; pending: number; limit: number; available: number };
  analysis: { used: number; reserved: number; limit: number; available: number };
  chat: { used: number; reserved: number; limit: number; available: number };
  drafting: { used: number; reserved: number; limit: number; available: number };
  reviewPagesPerUnit: number;
};
