"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";

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
}: {
  title: string;
  description: string;
  rows: ReportChartRow[];
  series: ReportChartSeries[];
  unit?: string;
  formatValue?: (value: number) => string;
}) {
  return (
    <section
      aria-label={title}
      className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <h2 className="font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
      <ChartContainer
        className="mt-5 h-72 w-full min-w-0 aspect-auto"
        config={Object.fromEntries(
          series.map((item) => [
            item.key,
            { label: item.label, color: item.color },
          ]),
        )}
      >
        <BarChart
          accessibilityLayer
          data={rows}
          margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
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
                : Number(value).toLocaleString("vi-VN", { notation: "compact" })
            }
          />
          <Tooltip
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
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((item) => (
            <Bar
              key={item.key}
              name={item.label}
              dataKey={item.key}
              fill={item.color}
              stackId={item.stack}
              maxBarSize={28}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </section>
  );
}
