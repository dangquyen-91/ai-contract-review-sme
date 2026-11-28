import type { ReportMetricChange } from "@/types/reports";

export function ReportChange({ change }: { change?: ReportMetricChange }) {
  if (!change) return null;
  if (change.status === "no_data")
    return (
      <p className="mt-3 text-xs text-slate-500">Chưa có dữ liệu so sánh</p>
    );
  const signed = (value: number) =>
    `${value > 0 ? "+" : ""}${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}`;
  return (
    <p className="mt-3 rounded-md bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium leading-5 text-slate-600">
      {change.unit === "percentage_points"
        ? `${signed(change.difference ?? 0)} điểm % so với kỳ so sánh`
        : change.status === "no_baseline"
          ? "Kỳ so sánh chưa có số liệu; chưa tính % tăng trưởng"
          : `${signed(change.changePercent ?? 0)}% so với kỳ so sánh`}
    </p>
  );
}
