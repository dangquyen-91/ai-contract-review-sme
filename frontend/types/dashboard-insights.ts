import type { DashboardRole } from "@/config/dashboard-roles";

export type InsightPeriod = "week" | "month" | "quarter" | "year";
export type DashboardInsights = {
  role: DashboardRole;
  scope: {
    type: "personal" | "organization" | "expert" | "system";
    id: string | null;
    // Staff report narrowed to the caller's own work.
    mine?: boolean;
  };
  computedAt: string;
  timezone: string;
  period: {
    kind: InsightPeriod;
    startDate: string;
    endDate: string;
    toExclusive: string;
    partial: boolean;
  };
  metrics: Record<string, number | null>;
  distribution: { key: string; label?: string; value: number }[];
  trend: { date: string; [key: string]: string | number | null }[];
};
