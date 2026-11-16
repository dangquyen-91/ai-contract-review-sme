"use client";

import { useState } from "react";
import { plansForAudience } from "@/lib/subscription/plan-selection";
import type { PlanAudience, PlanCode } from "@/types/subscription";
import { useSubscription } from "./use-subscription";
import { useSubscriptionPlans } from "./use-subscription-plans";

export function useSubscriptionCatalog(
  initialAudience: PlanAudience,
  accountId?: string | null,
) {
  const query = useSubscriptionPlans();
  const subscription = useSubscription(accountId);
  const [audience, setAudience] = useState(initialAudience);
  const [selected, setSelected] = useState<PlanCode | null>(null);

  function changeAudience(next: PlanAudience) {
    setAudience(next);
    setSelected(null);
  }

  return {
    query,
    subscription,
    audience,
    changeAudience,
    plans: plansForAudience(query.data ?? [], audience),
    selectedPlan: query.data?.find((plan) => plan.code === selected),
    selectPlan: setSelected,
    closePlan: () => setSelected(null),
  };
}
