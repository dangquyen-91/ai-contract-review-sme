import type { Metadata } from "next";
import { SubscriptionDashboardPage } from "@/components/subscription/subscription-dashboard-page";

export const metadata: Metadata = { title: "Gói dịch vụ của bạn | LawScan" };

export default function SubscriptionPage() {
  return <SubscriptionDashboardPage />;
}
