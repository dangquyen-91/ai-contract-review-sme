import { requirePermission } from "@/lib/auth/access";
import type { Metadata } from "next";
import { SubscriptionDashboardPage } from "@/components/subscription/subscription-dashboard-page";

export const metadata: Metadata = { title: "Gói dịch vụ của bạn | LawScan" };

export default async function SubscriptionPage() {
  const { user } = await requirePermission("subscription");
  return <SubscriptionDashboardPage user={user} />;
}
