"use client";

import { SubscriptionCatalogCard } from "./subscription-catalog-card";
import { PersonalContractReviewOption } from "./personal-contract-review-option";
import { describePlan } from "@/lib/subscription/subscription-plans";
import { Button } from "@/components/ui/button";
import { useSubscriptionPlans } from "@/hooks/subscription/use-subscription-plans";
import { useSubscription } from "@/hooks/subscription/use-subscription";
import {
  isCurrentPlan,
  plansForAudience,
} from "@/lib/subscription/plan-selection";

export function PersonalSubscriptionPlans({
  accountId,
}: {
  accountId: string;
}) {
  const plans = useSubscriptionPlans();
  const subscription = useSubscription(accountId);
  const personal = plansForAudience(plans.data ?? [], "personal");
  return (
    <section
      className="@container/plans mt-8"
      aria-labelledby="personal-plans-title"
    >
      <h2 id="personal-plans-title" className="text-xl font-semibold">
        Gói dành cho cá nhân
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Hạn mức riêng cho bạn. Không cần tạo hoặc tham gia tổ chức để sử dụng.
      </p>
      {plans.isPending ? (
        <p role="status" className="mt-4 text-sm">
          Đang tải các gói…
        </p>
      ) : plans.error ? (
        <p role="alert" className="mt-4 text-sm">
          Chưa tải được các gói.{" "}
          <Button variant="link" onClick={() => plans.refetch()}>
            Thử lại
          </Button>
        </p>
      ) : !personal.length ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Chưa có gói cá nhân để hiển thị.
        </p>
      ) : (
        <div className="mt-5 grid gap-6 @min-[680px]/plans:grid-cols-2">
          {personal.map((plan) => {
            const current = isCurrentPlan(subscription.data, plan.code);
            return (
              <SubscriptionCatalogCard
                key={plan.code}
                plan={describePlan(plan)}
                current={current}
                action={
                  plan.price === 0
                    ? { label: current ? "Đang sử dụng" : "Gói miễn phí" }
                    : {
                        label: current ? "Gia hạn gói" : "Nâng cấp gói",
                        href: "/goi-dich-vu/xac-nhan?plan=" + plan.code,
                      }
                }
                note={
                  plan.price === 0
                    ? current
                      ? "Được cấp tự động mỗi tháng."
                      : "Bạn có thể lên lịch về gói miễn phí trong phần quản lý gói hiện tại."
                    : undefined
                }
              />
            );
          })}
        </div>
      )}
      <PersonalContractReviewOption accountId={accountId} />
    </section>
  );
}
