"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import styles from "./admin-overview-charts.module.css";
import {
  filterDemoActivity,
  getDemoDaily,
  getDemoUsage,
  sumDemoActivity,
} from "./admin-demo-activity";

const usageColors = ["#059669", "#2563eb", "#f59e0b", "#8b5cf6"];

export function AdminOverviewCharts() {
  const [period, setPeriod] = useState(7);
  const records = filterDemoActivity(period);
  const daily = getDemoDaily(records, period);
  const usage = getDemoUsage(records).sort(
    (left, right) => right.total - left.total,
  );
  const success = sumDemoActivity(records, "success");
  const failed = sumDemoActivity(records, "failed");
  const maxDaily = Math.max(
    1,
    ...daily.map((item) => item.success + item.failed),
  );
  const usageTotal = usage.reduce((total, item) => total + item.total, 0);
  const usageSegments = usage.map((item, index) => {
    const percentage = usageTotal ? (item.total / usageTotal) * 100 : 0;
    return {
      ...item,
      percentage,
      start: usageTotal
        ? (usage
            .slice(0, index)
            .reduce((total, previous) => total + previous.total, 0) /
            usageTotal) *
          100
        : 0,
      color: usageColors[index],
    };
  });

  return (
    <section aria-labelledby="admin-charts-title" className="mt-7">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">
            Góc nhìn vận hành
          </p>
          <h2
            id="admin-charts-title"
            className="mt-1 text-xl font-semibold tracking-tight text-slate-900"
          >
            Xu hướng & mức sử dụng
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Dữ liệu minh họa từ 26/09–09/10/2026; cùng bộ dữ liệu với tab Báo
            cáo.
          </p>
        </div>
        <label className="grid gap-1.5 text-xs font-medium text-slate-600">
          Khoảng thời gian
          <select
            value={period}
            onChange={(event) => setPeriod(Number(event.target.value))}
            className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value={7}>7 ngày cuối của dữ liệu mẫu</option>
            <option value={14}>14 ngày của dữ liệu mẫu</option>
          </select>
        </label>
      </div>
      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
        <article className="min-w-0 overflow-hidden rounded-2xl border border-blue-100 bg-[#f7faff] shadow-[0_18px_42px_-38px_rgb(30_70_135_/_0.35)]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-blue-100 p-5">
            <div>
              <span className="mb-3 grid size-9 place-items-center rounded-lg bg-blue-100 text-blue-700">
                <Icon name="chart" className="size-5" />
              </span>
              <h3 className="text-sm font-semibold text-slate-900">
                Tác vụ AI theo ngày
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {success.toLocaleString("vi-VN")} thành công ·{" "}
                {failed.toLocaleString("vi-VN")} thất bại
              </p>
            </div>
            <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
              Minh họa
            </span>
          </div>
          <div className="p-5">
            <div className="mb-4 flex flex-wrap gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-blue-500" />
                Thành công
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-rose-400" />
                Thất bại
              </span>
              <strong className="ml-auto font-semibold tabular-nums text-slate-700">
                {((success / (success + failed)) * 100).toLocaleString(
                  "vi-VN",
                  { maximumFractionDigits: 1 },
                )}
                % thành công
              </strong>
            </div>
            <div className="overflow-x-auto pb-2">
              <div className="flex h-44 min-w-[480px] items-end gap-2 border-b border-l border-blue-100 px-3">
                {daily.map((item) => (
                  <div
                    key={item.day}
                    role="img"
                    tabIndex={0}
                    aria-label={`${item.day}: ${item.success} tác vụ thành công, ${item.failed} tác vụ thất bại`}
                    title={`${item.day}: ${item.success} thành công, ${item.failed} thất bại`}
                    className="flex h-full flex-1 items-end justify-center gap-1 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  >
                    <span
                      className={`${styles.dailyBar} w-2/5 rounded-t bg-blue-500`}
                      style={{ height: `${(item.success / maxDaily) * 100}%` }}
                    />
                    <span
                      className={`${styles.dailyBar} w-2/5 rounded-t bg-rose-400`}
                      style={{ height: `${(item.failed / maxDaily) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex min-w-[480px] gap-2 px-3 text-[10px] text-slate-500">
                {daily.map((item) => (
                  <span key={item.day} className="flex-1 text-center">
                    {item.day}
                  </span>
                ))}
              </div>
            </div>
            <details className="mt-4 rounded-lg border border-blue-100 bg-white/80 px-4 py-3 text-sm">
              <summary className="cursor-pointer font-medium text-blue-800 focus-visible:outline-2 focus-visible:outline-blue-600">
                Xem số liệu từng ngày
              </summary>
              <div className="mt-3 max-h-44 overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-500">
                    <tr>
                      <th scope="col" className="py-2">
                        Ngày
                      </th>
                      <th scope="col" className="py-2 text-right">
                        Thành công
                      </th>
                      <th scope="col" className="py-2 text-right">
                        Thất bại
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-50">
                    {daily.map((item) => (
                      <tr key={item.day}>
                        <td className="py-2">{item.day}</td>
                        <td className="py-2 text-right tabular-nums">
                          {item.success}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {item.failed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <Link
              href="/dashboard/admin/reports"
              className="mt-4 inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline"
            >
              Xem báo cáo chi tiết <Icon name="arrow" className="size-4" />
            </Link>
          </div>
        </article>
        <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-[#f4faf8] shadow-[0_18px_42px_-38px_rgb(30_100_85_/_0.3)]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-emerald-100 p-5">
            <div>
              <span className="mb-3 grid size-9 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                <Icon name="building" className="size-5" />
              </span>
              <h3 className="text-sm font-semibold text-slate-900">
                Mức sử dụng theo tổ chức
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Lượt xử lý trong khoảng thời gian đã chọn
              </p>
            </div>
            <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
              Minh họa
            </span>
          </div>
          <div className="flex flex-1 flex-col p-5">
            <div className="mx-auto mb-5 grid w-full place-items-center">
              <div className={`${styles.donut} relative size-44`}>
                <svg
                  viewBox="0 0 40 40"
                  role="img"
                  aria-label={`Tổng ${usageTotal.toLocaleString("vi-VN")} lượt xử lý của ${usage.length} tổ chức trong khoảng thời gian đã chọn`}
                  className="size-full -rotate-90"
                >
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    stroke="#d1fae5"
                    strokeWidth="8"
                  />
                  {usageSegments.map((item) => (
                    <circle
                      key={item.name}
                      cx="20"
                      cy="20"
                      r="16"
                      pathLength="100"
                      fill="none"
                      stroke={item.color}
                      strokeWidth="8"
                      strokeDasharray={`${item.percentage} ${100 - item.percentage}`}
                      strokeDashoffset={-item.start}
                    />
                  ))}
                </svg>
                <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
                  <strong className="text-2xl font-bold tabular-nums text-slate-900">
                    {usageTotal.toLocaleString("vi-VN")}
                  </strong>
                  <span className="text-[11px] text-slate-500">lượt xử lý</span>
                </div>
              </div>
            </div>
            <ol className="grid gap-2">
              {usageSegments.map((item) => (
                <li key={item.name}>
                  <Link
                    href={`/dashboard/admin/organizations?item=${encodeURIComponent(item.name)}`}
                    className="group flex items-center gap-3 rounded-lg bg-white/80 px-3 py-2.5 ring-1 ring-inset ring-emerald-100 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="min-w-0 flex-1 text-xs font-medium text-slate-700 group-hover:text-emerald-800">
                      {item.name}
                    </span>
                    <div className="shrink-0 text-right text-xs tabular-nums">
                      <strong className="block text-slate-800">
                        {item.total.toLocaleString("vi-VN")}
                      </strong>
                      <span className="text-slate-500">
                        {item.percentage.toLocaleString("vi-VN", {
                          maximumFractionDigits: 1,
                        })}
                        %
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              Chọn một tổ chức để xem thông tin mẫu.
            </p>
            <Link
              href="/dashboard/admin/reports"
              className="mt-auto inline-flex min-h-9 items-center gap-1.5 pt-4 text-sm font-semibold text-emerald-700 hover:underline"
            >
              Xem báo cáo chi tiết <Icon name="arrow" className="size-4" />
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
