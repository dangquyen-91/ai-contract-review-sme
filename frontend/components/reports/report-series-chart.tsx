"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { ChartContainer } from "@/components/ui/chart";
import type { ReportMetricChange } from "@/types/reports";
import {
  CHART_AXIS_LINE,
  CHART_COMPARE,
  CHART_GRID,
  ChartTooltip,
  chartTick,
  compactTick,
  formatChartBucket,
  formatChartTick,
  type ChartGranularity,
} from "./chart-parts";
import styles from "./reports.module.css";

export type ReportChartSeries = {
  key: string;
  label: string;
  color: string;
};
export type ReportChartRow = {
  label: string;
  [key: string]: string | number | null;
};
export type ReportChartSummary = {
  value: string;
  caption: string;
  change?: ReportMetricChange;
  /** Which direction of change is good news; "neutral" keeps the delta grey. */
  goodDirection?: "up" | "down" | "neutral";
};

function SummaryDelta({
  change,
  goodDirection = "up",
}: {
  change?: ReportMetricChange;
  goodDirection?: ReportChartSummary["goodDirection"];
}) {
  if (!change || change.status === "no_data") return null;
  if (change.status === "no_baseline")
    return <span className={styles.chartDelta}>Kỳ so sánh chưa có số liệu</span>;
  const points = change.unit === "percentage_points";
  const amount = points ? change.difference : change.changePercent;
  if (amount == null) return null;
  const direction = amount > 0 ? "up" : amount < 0 ? "down" : "flat";
  const tone =
    direction === "flat" || goodDirection === "neutral"
      ? "neutral"
      : direction === goodDirection
        ? "good"
        : "bad";
  const Icon =
    direction === "up"
      ? ArrowUpRight
      : direction === "down"
        ? ArrowDownRight
        : ArrowRight;
  const signed = `${amount > 0 ? "+" : ""}${amount.toLocaleString("vi-VN", {
    maximumFractionDigits: 1,
  })}${points ? " điểm %" : "%"}`;
  return (
    <span className={styles.chartDelta} data-tone={tone}>
      <Icon aria-hidden="true" className="size-3" />
      {signed}
      <span className="font-normal text-slate-500">so với kỳ so sánh</span>
    </span>
  );
}

function ChartLegend({
  series,
  compare,
  chartType,
}: {
  series: ReportChartSeries[];
  compare: boolean;
  chartType: "bar" | "line";
}) {
  const variant = chartType === "line" ? "line" : "bar";
  return (
    <ul className={styles.chartLegend} aria-label="Chú giải">
      {series.length > 1 &&
        series.map((item) => (
          <li key={item.key}>
            <span
              aria-hidden="true"
              className={styles.legendDot}
              style={{ background: item.color }}
            />
            {item.label}
          </li>
        ))}
      {compare && (
        <>
          {series.length > 1 && (
            <li aria-hidden="true" className={styles.legendDivider} />
          )}
          <li>
            <span
              aria-hidden="true"
              className={styles.legendKey}
              data-variant={variant}
              data-kind="current"
              style={{ ["--key" as string]: series[0]?.color }}
            />
            Kỳ này
          </li>
          <li>
            <span
              aria-hidden="true"
              className={styles.legendKey}
              data-variant={variant}
              data-kind="previous"
              style={{
                ["--key" as string]:
                  chartType === "line" ? CHART_COMPARE : series[0]?.color,
              }}
            />
            Kỳ so sánh
          </li>
        </>
      )}
    </ul>
  );
}

export function ReportSeriesChart({
  title,
  description,
  rows,
  series,
  compare = false,
  granularity = "day",
  summary,
  unit = "",
  formatValue,
  formatTick,
  chartType = "bar",
  wide = false,
}: {
  title: string;
  description: string;
  rows: ReportChartRow[];
  series: ReportChartSeries[];
  compare?: boolean;
  granularity?: ChartGranularity;
  summary?: ReportChartSummary;
  unit?: string;
  formatValue?: (value: number) => string;
  /** Short axis labels, when `formatValue` is too long for the axis. */
  formatTick?: (value: number) => string;
  chartType?: "bar" | "line";
  wide?: boolean;
}) {
  const gradientId = useId().replace(/:/g, "");
  const stacked = chartType === "bar" && series.length > 1;
  const keys = series.flatMap((item) =>
    compare ? [item.key, `previous_${item.key}`] : [item.key],
  );
  const hasData = rows.some((row) =>
    keys.some((key) => typeof row[key] === "number"),
  );
  const format = (value: number | null) =>
    value === null
      ? "—"
      : formatValue
        ? formatValue(value)
        : `${value.toLocaleString("vi-VN")}${unit ? ` ${unit}` : ""}`;
  const rowOf = (payload?: ReadonlyArray<{ payload?: unknown }>) =>
    payload?.[0]?.payload as ReportChartRow | undefined;

  const axes = [
    <CartesianGrid key="grid" vertical={false} stroke={CHART_GRID} />,
    <XAxis
      key="x"
      dataKey="label"
      tickLine={false}
      axisLine={{ stroke: CHART_AXIS_LINE }}
      tickMargin={8}
      minTickGap={20}
      tick={chartTick}
      tickFormatter={(value) => formatChartTick(value, granularity)}
    />,
    <YAxis
      key="y"
      allowDecimals={false}
      width={formatValue ? 58 : 44}
      tickLine={false}
      axisLine={false}
      tickMargin={4}
      tick={chartTick}
      tickFormatter={(value) =>
        formatTick
          ? formatTick(Number(value))
          : formatValue
            ? formatValue(Number(value))
            : compactTick(value)
      }
    />,
    <Tooltip
      key="tooltip"
      cursor={
        chartType === "line"
          ? { stroke: "#c3cedd", strokeWidth: 1 }
          : { fill: "#f3f6fb" }
      }
      isAnimationActive={false}
      content={(props) => {
        const row = rowOf(props.payload);
        return (
          <ChartTooltip
            active={props.active}
            row={row}
            title={formatChartBucket(row?.currentDate ?? row?.label, granularity)}
            subtitle={
              compare
                ? `So với ${formatChartBucket(row?.previousDate, granularity)}`
                : undefined
            }
            series={series}
            compare={compare}
            total={stacked}
            format={format}
          />
        );
      }}
    />,
  ];

  return (
    <section
      aria-label={title}
      className={`${styles.panel} ${styles.chart} ${wide ? "xl:col-span-2" : ""}`}
    >
      <div className={styles.chartHeader}>
        <div className="min-w-0">
          <h3 className={styles.chartTitle}>{title}</h3>
          <p className={styles.chartDescription}>{description}</p>
        </div>
        {summary && (
          <div className={styles.chartSummary}>
            <strong>{summary.value}</strong>
            <span>{summary.caption}</span>
            {compare && (
              <SummaryDelta
                change={summary.change}
                goodDirection={summary.goodDirection}
              />
            )}
          </div>
        )}
      </div>
      {(series.length > 1 || compare) && hasData && (
        <ChartLegend series={series} compare={compare} chartType={chartType} />
      )}
      {!hasData ? (
        <div className={styles.chartEmpty}>
          <p className="text-sm font-medium text-slate-600">
            Chưa có dữ liệu trong kỳ
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Chọn kỳ khác để xem số liệu phù hợp.
          </p>
        </div>
      ) : (
        <ChartContainer
          className="mt-3 h-64 w-full min-w-0 aspect-auto"
          config={Object.fromEntries(
            series.map((item) => [
              item.key,
              { label: item.label, color: item.color },
            ]),
          )}
        >
          {chartType === "line" ? (
            <AreaChart
              accessibilityLayer
              data={rows}
              margin={{ left: 0, right: 12, top: 10, bottom: 0 }}
            >
              <defs>
                {series.map((item) => (
                  <linearGradient
                    key={item.key}
                    id={`${gradientId}-${item.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={item.color}
                      stopOpacity={0.16}
                    />
                    <stop
                      offset="100%"
                      stopColor={item.color}
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                ))}
              </defs>
              {axes}
              {compare &&
                series.map((item) => (
                  <Line
                    key={`previous_${item.key}`}
                    name={`${item.label} · kỳ so sánh`}
                    dataKey={`previous_${item.key}`}
                    stroke={CHART_COMPARE}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={{
                      r: 3.5,
                      fill: CHART_COMPARE,
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                    connectNulls={false}
                    type="monotone"
                    isAnimationActive={false}
                  />
                ))}
              {series.map((item) => (
                <Area
                  key={item.key}
                  name={item.label}
                  dataKey={item.key}
                  stroke={item.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill={`url(#${gradientId}-${item.key})`}
                  dot={
                    rows.length <= 1
                      ? { r: 4, fill: item.color, stroke: "#fff", strokeWidth: 2 }
                      : false
                  }
                  activeDot={{
                    r: 4.5,
                    fill: item.color,
                    stroke: "#fff",
                    strokeWidth: 2,
                  }}
                  connectNulls={false}
                  type="monotone"
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          ) : (
            <BarChart
              accessibilityLayer
              data={rows}
              barGap={3}
              barCategoryGap={rows.length > 20 ? "18%" : "28%"}
              margin={{ left: 0, right: 8, top: 10, bottom: 0 }}
            >
              {axes}
              {(compare ? ["", "previous_"] : [""]).flatMap((prefix) =>
                series.map((item, index) => (
                  <Bar
                    key={`${prefix}${item.key}`}
                    name={item.label}
                    dataKey={`${prefix}${item.key}`}
                    fill={item.color}
                    fillOpacity={prefix ? 0.32 : 1}
                    stackId={stacked ? prefix || "current" : undefined}
                    stroke="#fff"
                    strokeWidth={stacked ? 1 : 0}
                    maxBarSize={compare ? 16 : 24}
                    radius={
                      !stacked || index === series.length - 1
                        ? [4, 4, 0, 0]
                        : undefined
                    }
                    isAnimationActive={false}
                  />
                )),
              )}
            </BarChart>
          )}
        </ChartContainer>
      )}
    </section>
  );
}
