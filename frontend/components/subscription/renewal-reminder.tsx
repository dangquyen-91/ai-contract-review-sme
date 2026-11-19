"use client";

import Link from "next/link";
import { useReviewAllowance } from "@/hooks/review/use-review-allowance";
import { useSubscriptionPlans } from "@/hooks/subscription/use-subscription-plans";

const date = (value: string) =>
  new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

/**
 * payOS cannot charge automatically, so plan managers are reminded in the app while
 * the renewal window is open (last 7 days) or during the 3-day grace period.
 */
export function RenewalReminder({ accountId }: { accountId?: string }) {
  const subscription = useReviewAllowance(accountId);
  const plans = useSubscriptionPlans();
  const renewal = subscription.data?.renewal;
  const trial = subscription.data?.trial;
  // The trial cannot be renewed; remind in its last 3 days to choose a plan.
  if (trial?.endingSoon)
    return (
      <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
        <span>Dùng thử kết thúc ngày {date(trial.endsAt)}. Chọn gói để tiếp tục dùng AI cho tổ chức.</span>
        <Link href="/goi-dich-vu?audience=business" className="font-semibold text-primary hover:underline">
          Chọn gói
        </Link>
      </div>
    );
  if (!renewal?.planCode || !renewal.payable || (renewal.status !== "open" && renewal.status !== "grace"))
    return null;
  const name = plans.data?.find((plan) => plan.code === renewal.planCode)?.name ?? renewal.planCode;
  const grace = renewal.status === "grace";
  return (
    <div
      role="status"
      className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
        grace ? "border-amber-300 bg-amber-50 text-amber-950" : "border-blue-200 bg-blue-50 text-blue-950"
      }`}
    >
      <span>
        {grace
          ? `Gói đã hết hạn ngày ${date(renewal.dueAt!)}. Gia hạn ${name} trước ngày ${date(renewal.graceUntil!)} để giữ gói.`
          : `Gói hiện tại hết hạn ngày ${date(renewal.dueAt!)}. Gia hạn ${name} để dùng tiếp không gián đoạn.`}
      </span>
      <Link
        href={`/goi-dich-vu/xac-nhan?plan=${renewal.planCode}`}
        className="font-semibold text-primary hover:underline"
      >
        Gia hạn ngay
      </Link>
    </div>
  );
}
