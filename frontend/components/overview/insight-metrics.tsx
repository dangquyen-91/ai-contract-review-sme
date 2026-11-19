import type { DashboardInsights } from "@/types/dashboard-insights";
import { dashboardInsightConfig } from "@/config/dashboard-insights";
import { formatInsight } from "@/lib/reports/insight-format";
import { ChartNoAxesColumn, CircleDot, Timer } from "lucide-react";
import styles from "@/components/reports/reports.module.css";

export function InsightMetrics({
  data,
  reportPage = false,
}: {
  data: DashboardInsights;
  reportPage?: boolean;
}) {
  const config = dashboardInsightConfig[data.role];
  return (
    <dl
      className={
        reportPage
          ? styles.metrics
          : "grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4 xl:flex xl:flex-wrap"
      }
      aria-label="Chỉ số thống kê"
    >
      {config.metrics.map((metric) => (
        <div
          key={metric.key}
          className={
            reportPage
              ? styles.metric
              : "min-w-0 bg-card px-4 py-5 sm:px-5 xl:flex-1 xl:basis-36"
          }
        >
          <dt
            className={
              reportPage
                ? styles.metricTop
                : "text-xs font-medium leading-5 text-muted-foreground"
            }
          >
            <span className={reportPage ? styles.metricLabel : undefined}>
              {metric.label}
            </span>
            {reportPage && (
              <span className={styles.metricIcon}>
                {metric.format === "duration" ? (
                  <Timer size={16} aria-hidden="true" />
                ) : metric.current ? (
                  <CircleDot size={16} aria-hidden="true" />
                ) : (
                  <ChartNoAxesColumn size={16} aria-hidden="true" />
                )}
              </span>
            )}
          </dt>
          <dd
            className={
              reportPage
                ? styles.metricValue
                : "mt-2 break-words text-2xl font-semibold leading-tight tracking-tight tabular-nums sm:text-[28px]"
            }
          >
            {formatInsight(data.metrics[metric.key], metric.format)}
          </dd>
          <dd
            className={
              reportPage
                ? styles.metricFoot
                : "mt-2 text-[11px] text-muted-foreground"
            }
          >
            {metric.current ? "Hiện tại" : "Trong kỳ đã chọn"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
