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
    <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium leading-5 text-slate-700">
      {change.unit === "percentage_points"
        ? `${signed(change.difference ?? 0)} điểm % so với kỳ so sánh`
        : change.status === "no_baseline"
          ? "Kỳ so sánh bằng 0; chưa tính % tăng trưởng"
          : `${signed(change.changePercent ?? 0)}% so với kỳ so sánh`}
    </p>
  );
}
