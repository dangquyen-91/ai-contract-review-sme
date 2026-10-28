"use client";

import { useState } from "react";
import { useSubscriptionPlans } from "@/hooks/subscription/use-subscription-plans";
import { describePlan } from "@/lib/subscription-plans";
import type { PlanAudience, PlanCode } from "@/types/subscription";
import { SubscriptionAudienceSwitch } from "./subscription-audience-switch";
import { SubscriptionPlanCard } from "./subscription-plan-card";
import { SubscriptionCatalogCard } from "./subscription-catalog-card";
import { SubscriptionPlanDialog } from "./subscription-plan-dialog";
import { SubscriptionPlanComparison } from "./subscription-plan-comparison";

export function SubscriptionPlanPicker({ showComparison = false, variant = "landing" }: { showComparison?: boolean; variant?: "landing" | "catalog" }) {
  const query = useSubscriptionPlans();
  const [audience, setAudience] = useState<PlanAudience>("business");
  const [selected, setSelected] = useState<PlanCode | null>(null);
  const plans = (query.data ?? []).filter((plan) => plan.audience === audience).sort((left, right) => left.price - right.price);
  const selectedPlan = query.data?.find((plan) => plan.code === selected);
  const Card = variant === "catalog" ? SubscriptionCatalogCard : SubscriptionPlanCard;
  return <div className="@container/plans text-[#080e2f] [color-scheme:light]">
    <div className="mb-10 mt-[30px] flex flex-col items-center gap-3"><SubscriptionAudienceSwitch value={audience} onChange={setAudience} variant={variant} /><p className="text-center text-[12px] text-[#63718a]">{audience === "personal" ? "Hạn mức riêng cho tài khoản cá nhân." : "Hạn mức dùng chung trong tổ chức; số thành viên bao gồm Owner."}</p></div>
    {query.isPending ? <div role="status" aria-label="Đang tải gói dịch vụ" className="grid grid-cols-1 gap-[22px] md:grid-cols-2">{[0, 1].map((item) => <div key={item} className="min-h-[480px] rounded-[22px] border border-[#dce4ef] bg-white p-7"><div className="h-7 w-2/3 rounded bg-slate-100 motion-safe:animate-pulse" /><div className="mt-8 h-14 w-3/4 rounded bg-slate-100 motion-safe:animate-pulse" /><div className="mt-8 h-44 rounded bg-slate-50 motion-safe:animate-pulse" /></div>)}</div> : query.isError ? <div role="alert" className="rounded-[22px] border border-[#dce4ef] bg-white p-7 text-center"><p className="font-semibold">Chưa thể tải gói dịch vụ</p><p className="mt-2 text-[14px] text-[#63718a]">{query.error.message}</p><button type="button" onClick={() => void query.refetch()} disabled={query.isFetching} className="mt-5 min-h-11 rounded-[10px] border border-[#d3dce9] bg-white px-5 text-[14px] font-semibold text-[#17253e] hover:bg-[#f5f8fc] disabled:opacity-50">{query.isFetching ? "Đang tải…" : "Thử lại"}</button></div> : !plans.length ? <p role="status" className="rounded-[22px] border border-[#dce4ef] bg-white p-7 text-center text-[14px] text-[#63718a]">Chưa có gói dành cho {audience === "personal" ? "cá nhân" : "tổ chức"}.</p> : <>
      <div className={variant === "catalog" ? "mx-auto grid max-w-[1000px] grid-cols-1 items-stretch gap-6 @min-[680px]/plans:grid-cols-2" : "mx-auto grid max-w-[1000px] grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))] items-stretch gap-[22px] max-[800px]:max-w-[500px]"}>{plans.map((plan) => <Card key={plan.code} plan={describePlan(plan)} onSelect={(next) => setSelected(next.code)} />)}</div>
      {showComparison && <SubscriptionPlanComparison plans={plans} />}
    </>}
    {selectedPlan && <SubscriptionPlanDialog plan={describePlan(selectedPlan)} onClose={() => setSelected(null)} />}
  </div>;
}
