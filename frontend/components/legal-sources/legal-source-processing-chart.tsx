"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { processingChartConfig, type LegalSourceChartItem } from "./legal-source-chart-config";

export function LegalSourceProcessingChart({ items }: { items: LegalSourceChartItem[] }) {
  const data = items.map((item) => ({ ...item, fill: `var(--color-${item.key})` }));
  const max = Math.max(1, ...items.map((item) => item.count));
  return <ChartContainer config={processingChartConfig} className="mt-5 h-60 w-full aspect-auto" role="img" aria-label={`Trạng thái xử lý: ${items.map((item) => `${item.label} ${item.count} nguồn`).join(", ")}`}>
    <BarChart accessibilityLayer data={data} layout="vertical" margin={{ top: 4, right: 28, bottom: 0, left: 0 }} barSize={14}>
      <CartesianGrid horizontal={false} strokeDasharray="3 5" stroke="#e2e8f0" />
      <XAxis type="number" domain={[0, max + 1]} allowDecimals={false} axisLine={false} tickLine={false} tickMargin={8} fontSize={11} stroke="#94a3b8" />
      <YAxis type="category" dataKey="label" width={112} axisLine={false} tickLine={false} tickMargin={10} tick={{ fill: "#64748b", fontSize: 12 }} />
      <ChartTooltip cursor={{ fill: "#f8fafc", radius: 8 }} content={<ChartTooltipContent hideLabel nameKey="key" formatter={(value, _name, item) => <div className="flex min-w-36 items-center justify-between gap-4"><span className="text-slate-600">{item.payload.label}</span><span className="font-semibold text-slate-900 tabular-nums">{Number(value).toLocaleString("vi-VN")} nguồn</span></div>} />} />
      <Bar dataKey="count" name="Nguồn" radius={[0, 5, 5, 0]} background={{ fill: "#f1f5f9", radius: 5 }} isAnimationActive={false}>
        <LabelList dataKey="count" position="right" offset={8} fill="#334155" fontSize={12} formatter={(value) => Number(value).toLocaleString("vi-VN")} />
      </Bar>
    </BarChart>
  </ChartContainer>;
}
