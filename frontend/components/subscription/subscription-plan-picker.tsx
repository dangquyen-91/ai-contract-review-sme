"use client";

import { useSubscriptionCatalog } from "@/hooks/subscription/use-subscription-catalog";
import { isCurrentPlan } from "@/lib/subscription/plan-selection";
import { describePlan } from "@/lib/subscription/subscription-plans";
import type { PlanAudience } from "@/types/subscription";
import { SubscriptionAudienceSwitch } from "./subscription-audience-switch";
import { SubscriptionPlanCard } from "./subscription-plan-card";
import { SubscriptionCatalogCard } from "./subscription-catalog-card";
import { SubscriptionPlanDialog } from "./subscription-plan-dialog";
import { SubscriptionPlanComparison } from "./subscription-plan-comparison";

export function SubscriptionPlanPicker({
  showComparison = false,
  variant = "landing",
  initialAudience = "business",
  accountId,
}: {
  showComparison?: boolean;
  variant?: "landing" | "catalog";
  initialAudience?: PlanAudience;
  accountId?: string | null;
}) {
  const {
    query,
    subscription,
    audience,
    changeAudience,
    plans,
    selectedPlan,
    selectPlan,
    closePlan,
  } = useSubscriptionCatalog(initialAudience, accountId);
  return (
    <div className="@container/plans text-[#080e2f] [color-scheme:light]">
      <div className="mb-10 mt-[30px] flex flex-col items-center gap-3">
        <SubscriptionAudienceSwitch
          value={audience}
          onChange={changeAudience}
          variant={variant}
        />
        <p className="text-center text-[12px] text-[#63718a]">
          {audience === "personal"
            ? "Hạn mức riêng cho tài khoản cá nhân."
            : "Hạn mức dùng chung trong tổ chức; số thành viên bao gồm Owner."}
        </p>
      </div>
      {query.isPending ? (
        <div
          role="status"
          aria-label="Đang tải gói dịch vụ"
          className="grid grid-cols-1 gap-[22px] md:grid-cols-2"
        >
          {[0, 1].map((item) => (
            <div
              key={item}
              className="min-h-[480px] rounded-[22px] border border-[#dce4ef] bg-white p-7"
            >
              <div className="h-7 w-2/3 rounded bg-slate-100 motion-safe:animate-pulse" />
              <div className="mt-8 h-14 w-3/4 rounded bg-slate-100 motion-safe:animate-pulse" />
              <div className="mt-8 h-44 rounded bg-slate-50 motion-safe:animate-pulse" />
            </div>
          ))}
        </div>
      ) : query.isError ? (
        <div
          role="alert"
          className="rounded-[22px] border border-[#dce4ef] bg-white p-7 text-center"
        >
          <p className="font-semibold">Chưa thể tải gói dịch vụ</p>
          <p className="mt-2 text-[14px] text-[#63718a]">
            {query.error.message}
          </p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
            className="mt-5 min-h-11 rounded-[10px] border border-[#d3dce9] bg-white px-5 text-[14px] font-semibold text-[#17253e] hover:bg-[#f5f8fc] disabled:opacity-50"
          >
            {query.isFetching ? "Đang tải…" : "Thử lại"}
          </button>
        </div>
      ) : !plans.length ? (
        <p
          role="status"
          className="rounded-[22px] border border-[#dce4ef] bg-white p-7 text-center text-[14px] text-[#63718a]"
        >
          Chưa có gói dành cho {audience === "personal" ? "cá nhân" : "tổ chức"}
          .
        </p>
      ) : (
        <>
          <div
            className={
              variant === "catalog"
                ? "mx-auto grid max-w-[1000px] grid-cols-1 items-stretch gap-6 @min-[680px]/plans:grid-cols-2"
                : "mx-auto grid max-w-[1000px] grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))] items-stretch gap-[22px] max-[800px]:max-w-[500px]"
            }
          >
            {plans.map((plan) => {
              const current = isCurrentPlan(subscription.data, plan.code);
              const displayPlan = describePlan(plan);
              return variant === "catalog" ? (
                <SubscriptionCatalogCard
                  key={plan.code}
                  plan={displayPlan}
                  current={current}
                  action={
                    current
                      ? {
                          label: "Quản lý gói đang dùng",
                          href: "/subscription",
                        }
                      : undefined
                  }
                  onSelect={(next) => selectPlan(next.code)}
                />
              ) : (
                <SubscriptionPlanCard
                  key={plan.code}
                  plan={displayPlan}
                  onSelect={(next) => selectPlan(next.code)}
                />
              );
            })}
          </div>
          {showComparison && <SubscriptionPlanComparison plans={plans} />}
        </>
      )}
      {selectedPlan && (
        <SubscriptionPlanDialog
          plan={describePlan(selectedPlan)}
          onClose={closePlan}
        />
      )}
    </div>
  );
}
