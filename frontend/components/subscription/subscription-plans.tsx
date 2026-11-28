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
import { SUBSCRIPTION_PLANS_ANCHOR } from "@/lib/subscription/plans-link";

const copy = {
  personal: {
    title: "Gói dành cho cá nhân",
    description: "Hạn mức riêng cho bạn. Không cần tạo hoặc tham gia tổ chức để sử dụng.",
    empty: "Chưa có gói cá nhân để hiển thị.",
  },
  business: {
    title: "Gói dành cho doanh nghiệp",
    description: "Hạn mức dùng chung trong tổ chức; số thành viên bao gồm Owner.",
    empty: "Chưa có gói doanh nghiệp để hiển thị.",
  },
};

/**
 * The plans of the current workspace, inside the dashboard. Only someone who pays for
 * the workspace (a personal account or an organization Owner) can choose one.
 */
export function SubscriptionPlans({
  accountId,
  audience,
  canPurchase,
}: {
  accountId: string;
  audience: "personal" | "business";
  canPurchase: boolean;
}) {
  const plans = useSubscriptionPlans();
  const subscription = useSubscription(accountId);
  const available = plansForAudience(plans.data ?? [], audience);
  const text = copy[audience];
  return (
    <section
      id={SUBSCRIPTION_PLANS_ANCHOR}
      className="@container/plans mt-8 scroll-mt-24"
      aria-labelledby="subscription-plans-title"
    >
      <h2 id="subscription-plans-title" className="text-xl font-semibold">
        {text.title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {text.description}
        {!canPurchase && " Chỉ chủ tổ chức được chọn gói và thanh toán."}
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
      ) : !available.length ? (
        <p className="mt-4 text-sm text-muted-foreground">{text.empty}</p>
      ) : (
        <div className="mt-5 grid gap-6 @min-[680px]/plans:grid-cols-2">
          {available.map((plan) => {
            const current = isCurrentPlan(subscription.data, plan.code);
            return (
              <SubscriptionCatalogCard
                key={plan.code}
                plan={describePlan(plan)}
                current={current}
                action={
                  plan.price === 0
                    ? { label: current ? "Đang sử dụng" : "Gói miễn phí" }
                    : canPurchase
                      ? {
                          label: current ? "Gia hạn gói" : "Nâng cấp gói",
                          href: "/goi-dich-vu/xac-nhan?plan=" + plan.code,
                        }
                      : { label: current ? "Đang sử dụng" : "Chủ tổ chức chọn gói" }
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
      {audience === "personal" && <PersonalContractReviewOption accountId={accountId} />}
    </section>
  );
}
