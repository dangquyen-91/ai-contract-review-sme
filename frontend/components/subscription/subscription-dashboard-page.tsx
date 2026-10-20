"use client";

import { DashboardShell } from "@/components/layouts/dashboard/dashboard-shell";
import { SubscriptionManagement } from "./subscription-management";

export function SubscriptionDashboardPage() {
  return <DashboardShell view="subscription">{({ data }) => <><h1 className="text-3xl font-bold tracking-tight">Gói dịch vụ của bạn</h1><p className="mt-2 text-sm text-muted-foreground">Theo dõi hạn mức và quản lý lịch hạ gói cho không gian cá nhân.</p>{data.organization.id ? <SubscriptionManagement orgId={data.organization.id} /> : <p className="mt-6 rounded-xl border bg-white p-5 text-sm text-muted-foreground">Bạn chưa có gói dịch vụ đang hoạt động.</p>}</>}</DashboardShell>;
}
