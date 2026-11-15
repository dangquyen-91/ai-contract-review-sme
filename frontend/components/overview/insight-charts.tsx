"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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

export function InsightCharts({ data }: { data: DashboardInsights }) {
  const config = dashboardInsightConfig[data.role];
  const distribution = data.distribution.map((row) => ({
    ...row,
    label: insightLabel(config.labels, row),
  }));
  const hasTrend = data.trend.some((row) =>
    config.series.some((series) => Number(row[series.key]) > 0),
  );
  const hasDistribution = distribution.some((row) => row.value > 0);
  const number = (value: number) =>
    value.toLocaleString("vi-VN", { notation: "compact" });
  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <section
        className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6"
        aria-label="Xu hướng hoạt động"
      >
        <h3 className="text-base font-semibold tracking-tight">
          Xu hướng hoạt động
        </h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {config.trendNote ??
            "Hợp đồng và lượt rà soát là hai loại số đếm riêng. Xem ngày của từng nhóm trong tooltip hoặc bảng số liệu."}
        </p>
        {hasTrend ? (
          <ChartContainer
            config={Object.fromEntries(
              config.series.map((series) => [
                series.key,
                { label: series.label, color: series.color },
              ]),
            )}
            className="mt-5 h-64 w-full min-w-0 aspect-auto sm:h-72"
          >
            <LineChart
              accessibilityLayer
              data={data.trend}
              margin={{ left: 0, right: 12, top: 12 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                minTickGap={30}
                tickFormatter={(date) => String(date).slice(5)}
              />
              <YAxis
                allowDecimals={false}
                width={40}
                axisLine={false}
                tickLine={false}
                tickFormatter={number}
              />
              <Tooltip
                formatter={(value) => Number(value).toLocaleString("vi-VN")}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              {config.series.map((series) => (
                <Line
                  key={series.key}
                  dataKey={series.key}
                  name={series.label}
                  stroke={series.color}
                  strokeWidth={2}
                  dot={data.trend.length === 1 ? { r: 3 } : false}
                  activeDot={{ r: 4 }}
                  type="linear"
                  isAnimationActive={false}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
        ) : (
          <EmptyChart text="Chưa có hoạt động trong kỳ đã chọn." />
        )}
      </section>
      <section
        className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6"
        aria-label={config.distributionTitle}
      >
        <h3 className="text-base font-semibold tracking-tight">
          {config.distributionTitle}
        </h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {config.distributionNote}
        </p>
        {hasDistribution ? (
          <ChartContainer
            config={{ value: { label: "Số lượng", color: "#2563eb" } }}
            className="mt-5 h-64 w-full min-w-0 aspect-auto sm:h-72"
          >
            <BarChart
              accessibilityLayer
              data={distribution}
              layout="vertical"
              margin={{ left: 0, right: 12 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis
                type="number"
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tickFormatter={number}
              />
              <YAxis
                type="category"
                dataKey="label"
                axisLine={false}
                tickLine={false}
                width={104}
                tick={{ fontSize: 11 }}
                tickFormatter={(label) =>
                  String(label).length > 17
                    ? `${String(label).slice(0, 16)}…`
                    : String(label)
                }
              />
              <Tooltip
                formatter={(value) => [
                  Number(value).toLocaleString("vi-VN"),
                  "Số lượng",
                ]}
              />
              <Bar
                dataKey="value"
                fill="var(--color-value)"
                radius={[0, 4, 4, 0]}
                maxBarSize={24}
                isAnimationActive={false}
              />
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
    <div className="mt-5 grid min-h-64 place-content-center rounded-lg bg-muted/40 px-6 text-center">
      <p className="text-sm font-medium">{text}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Số liệu sẽ xuất hiện khi có bản ghi phù hợp.
      </p>
    </div>
  );
}
