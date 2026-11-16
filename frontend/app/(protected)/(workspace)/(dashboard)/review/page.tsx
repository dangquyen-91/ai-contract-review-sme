import type { Metadata } from "next";
import { ReviewDashboardPage } from "@/components/review/review-page";

export const metadata: Metadata = { title: "Rà soát hợp đồng | LawScan" };

export default function ReviewPage() {
  return <ReviewDashboardPage />;
}
