"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { dashboardInsightConfig } from "@/config/dashboard-insights";
import type { DashboardInsights } from "@/types/dashboard-insights";
import { insightLabel } from "@/lib/reports/insight-format";
import {
  CHART_AXIS_LINE,
  CHART_GRID,
  ChartTooltip,
  chartTick,
  compactTick,
  formatChartBucket,
  formatChartTick,
} from "@/components/reports/chart-parts";
import styles from "@/components/reports/reports.module.css";

const DISTRIBUTION_COLOR = "#2a78d6";
const count = (value: number | null) =>
  value === null ? "—" : value.toLocaleString("vi-VN");

export function InsightCharts({
  data,
  reportPage = false,
}: {
  data: DashboardInsights;
  reportPage?: boolean;
}) {
  const gradientId = useId().replace(/:/g, "");
  const TrendChart = reportPage ? AreaChart : LineChart;
  const TrendSeries = reportPage ? Area : Line;
  const config = dashboardInsightConfig[data.role];
  const distribution = data.distribution.map((row) => ({
    ...row,
    label: insightLabel(config.labels, row),
  }));
  const distributionTotal = distribution.reduce(
    (sum, row) => sum + row.value,
    0,
  );
  const hasTrend = data.trend.some((row) =>
    config.series.some((series) => Number(row[series.key]) > 0),
  );
  const hasDistribution = distribution.some((row) => row.value > 0);
  const totals = Object.fromEntries(
    config.series.map((series) => [
      series.key,
      data.trend.reduce((sum, row) => sum + (Number(row[series.key]) || 0), 0),
    ]),
  );
  const panelClass = reportPage
    ? `${styles.panel} ${styles.chart}`
    : "min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6";
  const titleClass = reportPage
    ? styles.chartTitle
    : "text-base font-semibold tracking-tight";
  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <section className={panelClass} aria-label="Xu hướng hoạt động">
        <h3 className={titleClass}>Xu hướng hoạt động</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {config.trendNote ??
            "Hợp đồng và lượt rà soát là hai loại số đếm riêng. Xem ngày của từng nhóm trong tooltip hoặc bảng số liệu."}
        </p>
        {hasTrend && (
          <ul className={styles.seriesTotals} aria-label="Tổng trong kỳ">
            {config.series.map((series) => (
              <li key={series.key}>
                <span>
                  <span
                    aria-hidden="true"
                    className={styles.legendDot}
                    style={{ background: series.color }}
                  />
                  {series.label}
                </span>
                <strong>{count(totals[series.key])}</strong>
              </li>
            ))}
          </ul>
        )}
        {hasTrend ? (
          <ChartContainer
            config={Object.fromEntries(
              config.series.map((series) => [
                series.key,
                { label: series.label, color: series.color },
              ]),
            )}
            className="mt-4 h-64 w-full min-w-0 aspect-auto sm:h-72"
          >
            <TrendChart
              accessibilityLayer
              data={data.trend}
              margin={{ left: 0, right: 12, top: 10, bottom: 0 }}
            >
              {reportPage && (
                <defs>
                  {config.series.map((series) => (
                    <linearGradient
                      key={series.key}
                      id={`${gradientId}-${series.key}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={series.color}
                        stopOpacity={0.12}
                      />
                      <stop
                        offset="100%"
                        stopColor={series.color}
                        stopOpacity={0.01}
                      />
                    </linearGradient>
                  ))}
                </defs>
              )}
              <CartesianGrid vertical={false} stroke={CHART_GRID} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={{ stroke: CHART_AXIS_LINE }}
                tickMargin={8}
                minTickGap={24}
                tick={chartTick}
                tickFormatter={(date) => formatChartTick(date, "day")}
              />
              <YAxis
                allowDecimals={false}
                width={40}
                axisLine={false}
                tickLine={false}
                tick={chartTick}
                tickFormatter={compactTick}
              />
              <Tooltip
                cursor={{ stroke: "#c3cedd", strokeWidth: 1 }}
                isAnimationActive={false}
                content={(props) => {
                  const row = props.payload?.[0]?.payload as
                    | DashboardInsights["trend"][number]
                    | undefined;
                  return (
                    <ChartTooltip
                      active={props.active}
                      row={row}
                      title={formatChartBucket(row?.date, "day")}
                      series={config.series}
                      format={count}
                    />
                  );
                }}
              />
              {config.series.map((series) => (
                <TrendSeries
                  key={series.key}
                  dataKey={series.key}
                  name={series.label}
                  stroke={series.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill={
                    reportPage ? `url(#${gradientId}-${series.key})` : "none"
                  }
                  dot={
                    data.trend.length === 1
                      ? { r: 4, fill: series.color, stroke: "#fff", strokeWidth: 2 }
                      : false
                  }
                  activeDot={{
                    r: 4.5,
                    fill: series.color,
                    stroke: "#fff",
                    strokeWidth: 2,
                  }}
                  type="monotone"
                  isAnimationActive={false}
                  connectNulls={false}
                />
              ))}
            </TrendChart>
          </ChartContainer>
        ) : (
          <EmptyChart text="Chưa có hoạt động trong kỳ đã chọn." />
        )}
      </section>
      <section className={panelClass} aria-label={config.distributionTitle}>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className={titleClass}>{config.distributionTitle}</h3>
          {hasDistribution && (
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              Tổng {count(distributionTotal)}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {config.distributionNote}
        </p>
        {hasDistribution ? (
          <ChartContainer
            config={{ value: { label: "Số lượng", color: DISTRIBUTION_COLOR } }}
            className="mt-5 h-64 w-full min-w-0 aspect-auto sm:h-72"
          >
            <BarChart
              accessibilityLayer
              data={distribution}
              layout="vertical"
              barCategoryGap="30%"
              margin={{ left: 0, right: 40, top: 0, bottom: 0 }}
            >
              <CartesianGrid horizontal={false} stroke={CHART_GRID} />
              <XAxis
                type="number"
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={chartTick}
                tickFormatter={compactTick}
              />
              <YAxis
                type="category"
                dataKey="label"
                axisLine={false}
                tickLine={false}
                width={112}
                tick={{ ...chartTick, fill: "#52607a", fontSize: 11 }}
                tickFormatter={(label) =>
                  String(label).length > 18
                    ? `${String(label).slice(0, 17)}…`
                    : String(label)
                }
              />
              <Tooltip
                cursor={{ fill: "#f3f6fb" }}
                isAnimationActive={false}
                content={(props) => {
                  const row = props.payload?.[0]?.payload as
                    | (typeof distribution)[number]
                    | undefined;
                  return (
                    <ChartTooltip
                      active={props.active}
                      row={row}
                      title={row?.label ?? ""}
                      subtitle={
                        row && distributionTotal
                          ? `${((row.value / distributionTotal) * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}% tổng`
                          : undefined
                      }
                      series={[
                        {
                          key: "value",
                          label: "Số lượng",
                          color: DISTRIBUTION_COLOR,
                        },
                      ]}
                      format={count}
                    />
                  );
                }}
              />
              <Bar
                dataKey="value"
                fill="var(--color-value)"
                radius={[0, 4, 4, 0]}
                maxBarSize={20}
                background={{ fill: "#f4f7fb", radius: 4 }}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="value"
                  position="right"
                  offset={8}
                  className="fill-slate-600 text-[11px] tabular-nums"
                  formatter={(value) => count(Number(value))}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <EmptyChart text="Chưa có dữ liệu phân bố." />
        )}
      </section>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="mt-5 grid min-h-64 place-content-center rounded-lg border border-dashed border-border bg-muted/30 px-6 text-center">
      <p className="text-sm font-medium">{text}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Số liệu sẽ xuất hiện khi có bản ghi phù hợp.
      </p>
    </div>
  );
}
