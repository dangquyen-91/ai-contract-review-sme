import type { Metadata } from "next";
import { ReviewDashboardPage } from "@/components/review/review-page";
import { requireDashboardRole } from "@/lib/dashboard-route-access";

export const metadata: Metadata = { title: "Rà soát hợp đồng | LawScan", robots: { index: false, follow: false } };

export default async function ReviewPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  await requireDashboardRole(role);
  return <ReviewDashboardPage />;
}
