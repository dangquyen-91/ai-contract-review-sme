"use client";

import { ReviewContent } from "@/components/review/review-content";
import { DashboardShell } from "@/components/layouts/dashboard/dashboard-shell";

export function ReviewDashboardPage() {
  return <DashboardShell view="review">{(context) => <ReviewContent {...context} />}</DashboardShell>;
}
