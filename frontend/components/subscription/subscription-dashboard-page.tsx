"use client";

import { DashboardShell } from "@/components/layouts/dashboard/dashboard-shell";
import { billingAccountId } from "@/lib/subscription/billing-account";
import type { AuthUser } from "@/types/auth";
import { SubscriptionManagement } from "./subscription-management";
import { PersonalSubscriptionPlans } from "./personal-subscription-plans";

export function SubscriptionDashboardPage({ user }: { user: AuthUser }) {
  const accountId = billingAccountId(user);
  return (
    <DashboardShell view="subscription">
      {() => (
        <>
          <h1 className="text-3xl font-bold tracking-tight">
            Gói dịch vụ của bạn
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Theo dõi hạn mức, chọn gói phù hợp và quản lý thanh toán cho tài
            khoản của bạn.
          </p>
          {accountId && (
            <>
              <SubscriptionManagement orgId={accountId} />
              {user.role === "user" && (
                <PersonalSubscriptionPlans accountId={accountId} />
              )}
            </>
          )}
        </>
      )}
    </DashboardShell>
  );
}
