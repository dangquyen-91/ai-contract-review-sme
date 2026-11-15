import type { DashboardInsights } from "@/types/dashboard-insights";
import { dashboardInsightConfig } from "@/config/dashboard-insights";
import { formatInsight } from "@/lib/reports/insight-format";

export function InsightMetrics({ data }: { data: DashboardInsights }) {
  const config = dashboardInsightConfig[data.role];
  return (
    <dl
      className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4 xl:flex xl:flex-wrap"
      aria-label="Chỉ số thống kê"
    >
      {config.metrics.map((metric) => (
        <div
          key={metric.key}
          className="min-w-0 bg-card px-4 py-5 sm:px-5 xl:flex-1 xl:basis-36"
        >
          <dt className="text-xs font-medium leading-5 text-muted-foreground">
            {metric.label}
          </dt>
          <dd className="mt-2 break-words text-2xl font-semibold leading-tight tracking-tight tabular-nums sm:text-[28px]">
            {formatInsight(data.metrics[metric.key], metric.format)}
          </dd>
          <dd className="mt-2 text-[11px] text-muted-foreground">
            {metric.current ? "Hiện tại" : "Trong kỳ đã chọn"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
