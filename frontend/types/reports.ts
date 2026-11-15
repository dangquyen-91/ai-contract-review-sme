export type OperationalReport = {
  computedAt: string;
  timezone: string;
  period: {
    days: number;
    from: string;
    toExclusive: string;
    startDate: string;
    endDate: string;
    kind?: ReportFilters["period"];
    anchorDate?: string;
    partial?: boolean;
    nominalEndDate?: string;
  };
  scope: { type: string; organizationId: string | null };
  uploadedContracts: number;
  reviews: {
    completed: number;
    failed: number;
    cancelled: number;
    finished: number;
    queued: number;
    running: number;
    timedReviews: number;
    averageDurationMs: number | null;
    successRate: number | null;
  };
  risks: {
    high: number;
    medium: number;
    low: number;
    none: number;
    unknown: number;
    assessedContracts: number;
    highRiskRate: number | null;
    percentages?: Record<"high" | "medium" | "low" | "none", number | null>;
  };
  payments: { amount: number; count: number; unfulfilled: number } | null;
  consumedUnits: { analysis: number; chat: number; drafting: number };
  daily: { date: string; completed: number; failed: number }[];
  usage: {
    id: string;
    name: string;
    completed: number;
    failed: number;
    total: number;
  }[];
  organizations: { id: string; name: string }[];
  comparison?: {
    mode: ReportFilters["comparison"];
    period: OperationalReport["period"] | null;
    changes: Record<string, ReportMetricChange>;
    previousRisk: OperationalReport["risks"] | null;
  };
  trend?: {
    granularity: "day" | "week" | "month";
    buckets: {
      index: number;
      label: string;
      current: ReportSeries | null;
      previous: ReportSeries | null;
    }[];
  };
};
export type ReportFilters = {
  period: "week" | "month" | "quarter" | "year" | "custom";
  comparison: "none" | "previous" | "year";
  granularity: "auto" | "day" | "week" | "month";
  anchor?: string;
  start?: string;
  end?: string;
  organizationId?: string;
};
export type ReportMetricChange = {
  current: number | null;
  previous: number | null;
  difference: number | null;
  changePercent: number | null;
  unit: "percent" | "percentage_points";
  status: "comparable" | "no_data" | "no_baseline";
};
export type ReportSeries = {
  date: string;
  uploads: number;
  completed: number;
  failed: number;
  cancelled: number;
  receivedAmount: number | null;
  analysis: number;
  chat: number;
  drafting: number;
  durationSumMs: number;
  timedReviews: number;
  averageDurationMs: number | null;
};
