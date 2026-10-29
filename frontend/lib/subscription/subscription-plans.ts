import type { SubscriptionPlan } from "@/types/subscription";

export const formatMoney = (amount: number) =>
  new Intl.NumberFormat("vi-VN").format(amount) + "đ";
export const formatPlanNumber = (amount: number) =>
  amount.toLocaleString("vi-VN");

export function describePlan(plan: SubscriptionPlan) {
  const personal = plan.audience === "personal";
  return {
    ...plan,
    id: plan.code,
    description: personal
      ? plan.price === 0
        ? "Bắt đầu rà soát hợp đồng cá nhân với hạn mức miễn phí mỗi tháng."
        : "Dành cho cá nhân cần phân tích và trao đổi về hợp đồng thường xuyên."
      : plan.code === "business_starter"
        ? "Cho doanh nghiệp nhỏ cần một quy trình rà soát hợp đồng rõ ràng."
        : "Cho đội ngũ xử lý nhiều hợp đồng và cần hạn mức lớn hơn.",
    icon: personal
      ? plan.price === 0
        ? ("document" as const)
        : ("sparkle" as const)
      : ("team" as const),
    recommended: plan.code === "business_starter",
    featureHeading: "Hạn mức trong mỗi kỳ tháng",
    features: [
      `${formatPlanNumber(plan.analysisLimit)} lượt rà soát · 1 lượt/5 trang`,
      `${formatPlanNumber(plan.chatLimit)} lượt chat về hợp đồng`,
      ...(!personal
        ? [`${formatPlanNumber(plan.draftingLimit ?? 0)} lượt soạn hợp đồng AI`]
        : []),
      personal
        ? `${formatPlanNumber(plan.memberLimit)} tài khoản cá nhân`
        : `Tối đa ${formatPlanNumber(plan.memberLimit)} thành viên, bao gồm Owner`,
      personal
        ? "Hạn mức riêng cho không gian cá nhân"
        : "Hạn mức dùng chung trong tổ chức",
    ],
  };
}

export type DisplaySubscriptionPlan = ReturnType<typeof describePlan>;
