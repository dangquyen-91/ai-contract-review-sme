import type {
  OrganizationSubscription,
  PlanAudience,
  PlanCode,
  SubscriptionPlan,
} from "@/types/subscription";

export function plansForAudience(
  plans: SubscriptionPlan[],
  audience: PlanAudience,
) {
  return plans
    .filter((plan) => plan.audience === audience)
    .sort((a, b) => a.price - b.price);
}

export function isCurrentPlan(
  subscription: OrganizationSubscription | undefined,
  code: PlanCode,
) {
  return subscription?.status === "active" && subscription.plan?.code === code;
}
