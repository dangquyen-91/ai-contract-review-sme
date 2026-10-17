"use client";

import { Pie, PieChart } from "recharts";
import { ArrowUpRight } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { sourceTypeChartConfig, type LegalSourceChartItem } from "./legal-source-chart-config";

export function LegalSourceTypeChart({ items, total, onSelectType }: {
  items: LegalSourceChartItem[]; total: number; onSelectType: (type: string) => void;
}) {
  const data = items.map((item) => ({ ...item, fill: `var(--color-${item.key})`, percentage: total ? item.count / total * 100 : 0 }));
  const visible = data.filter((item) => item.count > 0);
  return <>
    <div className="mt-5 grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="relative min-w-0">
        <ChartContainer config={sourceTypeChartConfig} className="mx-auto aspect-square h-60 w-full max-w-64" role="img" aria-label={`Cơ cấu ${total} nguồn: ${items.map((item) => `${item.label} ${item.count}`).join(", ")}`}>
          <PieChart accessibilityLayer>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="key" formatter={(value, _name, item) => <div className="flex min-w-36 flex-col gap-1"><span className="font-semibold text-slate-900">{item.payload.label}</span><span className="text-slate-600">{Number(value).toLocaleString("vi-VN")} nguồn · {Math.round(item.payload.percentage)}%</span></div>} />} />
            <Pie data={visible} dataKey="count" nameKey="key" innerRadius="66%" outerRadius="90%" paddingAngle={visible.length > 1 ? 4 : 0} cornerRadius={6} strokeWidth={0} isAnimationActive={false} className="cursor-pointer transition-opacity hover:opacity-90" onClick={(entry) => { if (typeof entry.key === "string") onSelectType(entry.key); }} />
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center"><strong className="text-4xl font-semibold tracking-tight text-slate-900 tabular-nums">{total.toLocaleString("vi-VN")}</strong><span className="mt-1 text-ui-meta text-slate-500">Tổng nguồn</span></div>
      </div>
      <ul className="min-w-0 space-y-1">{data.map((item) => <li key={item.key}><button type="button" onClick={() => onSelectType(item.key)} className="group flex min-h-11 w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-ui text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600" aria-label={`Lọc ${item.label}: ${item.count} nguồn`}>
        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: sourceTypeChartConfig[item.key as keyof typeof sourceTypeChartConfig]?.color }} aria-hidden="true" />
        <span className="min-w-0 flex-1 leading-5">{item.label}</span><span className="font-semibold text-slate-900 tabular-nums">{item.count}</span><span className="w-9 text-right text-ui-caption text-slate-400 tabular-nums">{Math.round(item.percentage)}%</span>
      </button></li>)}</ul>
    </div>
    <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-ui-meta text-slate-500"><ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />Chọn một loại nguồn để xem danh sách tương ứng.</div>
  </>;
}
