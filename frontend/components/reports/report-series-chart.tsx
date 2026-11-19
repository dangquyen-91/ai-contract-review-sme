"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import styles from "./reports.module.css";

export type ReportChartSeries = {
  key: string;
  label: string;
  color: string;
  stack?: string;
};
export type ReportChartRow = {
  label: string;
  [key: string]: string | number | null;
};

export function ReportSeriesChart({
  title,
  description,
  rows,
  series,
  unit = "",
  formatValue,
  chartType = "bar",
  wide = false,
}: {
  title: string;
  description: string;
  rows: ReportChartRow[];
  series: ReportChartSeries[];
  unit?: string;
  formatValue?: (value: number) => string;
  chartType?: "bar" | "line";
  wide?: boolean;
}) {
  const gradientId = useId().replace(/:/g, "");
  const Chart = chartType === "line" ? AreaChart : BarChart;
  const hasData = rows.some((row) =>
    series.some((item) => typeof row[item.key] === "number"),
  );
  return (
    <section
      aria-label={title}
      className={`${styles.panel} ${styles.chart} ${wide ? "xl:col-span-2" : ""}`}
    >
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>{title}</h3>
        <span className={styles.chartBadge}>
          {chartType === "line" ? "XU HƯỚNG" : "PHÂN TÍCH"}
        </span>
      </div>
      <p className={styles.chartDescription}>{description}</p>
      {!hasData ? (
        <div className="mt-5 grid h-72 place-content-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center">
          <p className="text-sm font-medium text-slate-600">
            Chưa có dữ liệu trong kỳ
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Chọn kỳ khác để xem số liệu phù hợp.
          </p>
        </div>
      ) : (
        <ChartContainer
          className="mt-5 h-72 w-full min-w-0 aspect-auto"
          config={Object.fromEntries(
            series.map((item) => [
              item.key,
              { label: item.label, color: item.color },
            ]),
          )}
        >
          <Chart
            accessibilityLayer
            data={rows}
            margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
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
                  <stop offset="0%" stopColor={item.color} stopOpacity={0.18} />
                  <stop
                    offset="95%"
                    stopColor={item.color}
                    stopOpacity={0.01}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="#e9eff7"
              strokeDasharray="4 4"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              minTickGap={24}
              tickFormatter={(value) => String(value).slice(5)}
            />
            <YAxis
              allowDecimals={false}
              width={48}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                formatValue
                  ? formatValue(Number(value))
                  : Number(value).toLocaleString("vi-VN", {
                      notation: "compact",
                    })
              }
            />
            <Tooltip
              contentStyle={{
                border: "1px solid #e1e7f0",
                borderRadius: 12,
                boxShadow: "0 8px 30px #1e3a5f15",
                fontSize: 11,
              }}
              formatter={(value) =>
                formatValue
                  ? formatValue(Number(value))
                  : `${Number(value).toLocaleString("vi-VN")} ${unit}`
              }
              labelFormatter={(_label, items) => {
                const row = items[0]?.payload as ReportChartRow | undefined;
                return row
                  ? `Kỳ này: ${row.currentDate ?? "—"} · So sánh: ${row.previousDate ?? "—"}`
                  : "";
              }}
            />
            <Legend
              iconType="circle"
              iconSize={7}
              wrapperStyle={{ fontSize: 10, paddingTop: 16 }}
            />
            {series.map((item) =>
              chartType === "line" ? (
                <Area
                  key={item.key}
                  name={item.label}
                  dataKey={item.key}
                  stroke={item.color}
                  strokeWidth={item.key.startsWith("previous_") ? 1.75 : 2.5}
                  fill={
                    item.key.startsWith("previous_")
                      ? "transparent"
                      : `url(#${gradientId}-${item.key})`
                  }
                  strokeDasharray={
                    item.key.startsWith("previous_") ? "5 4" : undefined
                  }
                  dot={rows.length === 1 ? { r: 3 } : false}
                  connectNulls={false}
                  type="linear"
                  isAnimationActive={false}
                />
              ) : (
                <Bar
                  key={item.key}
                  name={item.label}
                  dataKey={item.key}
                  fill={item.color}
                  stackId={item.stack}
                  maxBarSize={28}
                  radius={item.stack ? undefined : [4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              ),
            )}
          </Chart>
        </ChartContainer>
      )}
    </section>
  );
}
