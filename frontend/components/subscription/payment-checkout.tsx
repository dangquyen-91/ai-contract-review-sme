"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { workspacePath } from "@/lib/routing/workspace-path";
import { billingAccountId } from "@/lib/subscription/billing-account";
import { WorkspaceCheckout } from "./workspace-checkout";
import type { AuthUser } from "@/types/auth";
import type { SubscriptionPlan } from "@/types/subscription";

export function PaymentCheckout({
  plan,
  user,
}: {
  plan: SubscriptionPlan;
  user: AuthUser | null;
}) {
  const returnTo = `/goi-dich-vu/xac-nhan?plan=${plan.code}`;
  if (!user)
    return (
      <div className="mt-6 grid gap-3">
        <p className="text-sm text-[#61708b]">
          Đăng nhập để thanh toán và cấp gói cho đúng tài khoản.
        </p>
        <Button asChild>
          <Link href={`/dang-nhap?returnTo=${encodeURIComponent(returnTo)}`}>
            Đăng nhập để thanh toán
          </Link>
        </Button>
        <Link
          className="text-center text-sm text-[#0066ff]"
          href={`/dang-ky?returnTo=${encodeURIComponent(returnTo)}`}
        >
          Chưa có tài khoản? Đăng ký
        </Link>
      </div>
    );
  const accountId = billingAccountId(user);
  if (!accountId)
    return (
      <div className="mt-6 grid gap-3">
        <p className="text-sm text-[#61708b]">
          Hoàn tất thiết lập không gian cá nhân hoặc tổ chức trước khi mua gói.
        </p>
        <Button asChild>
          <Link href={workspacePath(user)}>Thiết lập không gian</Link>
        </Button>
      </div>
    );
  if (!["owner", "user"].includes(user.role))
    return (
      <p role="alert" className="mt-6 text-sm text-[#61708b]">
        Chỉ Owner có thể mua gói cho tổ chức. Hãy liên hệ Owner của bạn.
      </p>
    );
  return (
    <WorkspaceCheckout
      key={`${accountId}:${plan.code}`}
      orgId={accountId}
      plan={plan}
    />
  );
}
