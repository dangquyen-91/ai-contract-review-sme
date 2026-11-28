"use client";

import { DashboardShell } from "@/components/layouts/dashboard/dashboard-shell";
import { billingAccountId } from "@/lib/subscription/billing-account";
import { useOptionalOrganizationDashboard } from "@/providers/dashboard-provider";
import type { AuthUser } from "@/types/auth";
import { SubscriptionManagement } from "./subscription-management";
import { SubscriptionPlans } from "./subscription-plans";

/** Plans of the current workspace: the personal account, or the organization. */
export function SubscriptionDashboardPage({ user }: { user: AuthUser }) {
  // Inside an organization the workspace layout already draws the dashboard frame.
  const organization = useOptionalOrganizationDashboard();
  if (organization) return <SubscriptionContent user={user} />;
  return <DashboardShell view="subscription">{() => <SubscriptionContent user={user} />}</DashboardShell>;
}

function SubscriptionContent({ user }: { user: AuthUser }) {
  const accountId = billingAccountId(user);
  const personal = user.role === "user";
  // Only the payer manages a plan: the personal account, or the organization Owner.
  const canPurchase = personal || user.role === "owner";
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">
        {personal ? "Gói dịch vụ của bạn" : "Gói dịch vụ của tổ chức"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {personal
          ? "Theo dõi hạn mức, chọn gói phù hợp và quản lý thanh toán cho tài khoản của bạn."
          : canPurchase
            ? "Theo dõi hạn mức dùng chung, chọn gói và quản lý thanh toán cho tổ chức."
            : "Theo dõi gói và hạn mức dùng chung của tổ chức."}
      </p>
      {accountId && (
        <>
          <SubscriptionManagement orgId={accountId} readOnly={!canPurchase} />
          <SubscriptionPlans accountId={accountId} audience={personal ? "personal" : "business"} canPurchase={canPurchase} />
        </>
      )}
    </>
  );
}
