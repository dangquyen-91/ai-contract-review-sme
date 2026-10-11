"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { PageHeading } from "./admin-panels";
import {
  demoOrganizations as organizations,
  filterDemoActivity,
  getDemoDaily,
  getDemoUsage,
  sumDemoActivity as sum,
} from "./admin-demo-activity";

export function ReportsOverview() {
  const [period, setPeriod] = useState(7);
  const [organization, setOrganization] = useState("");
  const filtered = useMemo(
    () => filterDemoActivity(period, organization),
    [period, organization],
  );
  const success = sum(filtered, "success");
  const failed = sum(filtered, "failed");
  const total = success + failed;
  const daily = getDemoDaily(filtered, period);
  const maxDaily = Math.max(
    1,
    ...daily.map((item) => item.success + item.failed),
  );
  const risk = [
    {
      label: "Rủi ro cao",
      value: sum(filtered, "high"),
      color: "#ef4444",
      tone: "bg-rose-500",
    },
    {
      label: "Trung bình",
      value: sum(filtered, "medium"),
      color: "#f59e0b",
      tone: "bg-amber-400",
    },
    {
      label: "Rủi ro thấp",
      value: sum(filtered, "low"),
      color: "#86efac",
      tone: "bg-emerald-300",
    },
  ];
  const riskTotal = risk.reduce((value, item) => value + item.value, 0);
  const usage = getDemoUsage(filtered).filter(
    (item) => !organization || item.name === organization,
  );
  const maxUsage = Math.max(1, ...usage.map((item) => item.total));
  let offset = 0;

  function exportDemo() {
    const rows = [
      [
        "Ngày",
        "Tổ chức",
        "Thành công",
        "Thất bại",
        "Rủi ro cao",
        "Trung bình",
        "Rủi ro thấp",
      ],
      ...filtered.map((item) => [
        item.day,
        item.organization,
        item.success,
        item.failed,
        item.high,
        item.medium,
        item.low,
      ]),
    ];
    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row
            .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
            .join(","),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "lawscan-bao-cao-MINH-HOA.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeading
        eyebrow="Phân tích"
        title="Báo cáo & thống kê"
        description="Xem trước xu hướng xử lý AI, mức rủi ro và mức sử dụng của các tổ chức."
      />
      <section className="mb-6 flex items-start gap-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-amber-700">
          <Icon name="chart" className="size-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-amber-950">
            Báo cáo minh họa
          </h2>
          <p className="mt-1 text-sm leading-6 text-amber-900/75">
            Toàn bộ số liệu và file CSV ở trang này là dữ liệu mẫu từ
            26/09–09/10/2026. Bộ lọc đang hoạt động trên dữ liệu mẫu và sẽ được
            nối API sau.
          </p>
        </div>
      </section>
      <section
        aria-label="Bộ lọc báo cáo"
        className="mb-6 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <label className="grid gap-2 text-xs font-medium text-slate-500">
          Khoảng thời gian
          <select
            value={period}
            onChange={(event) => setPeriod(Number(event.target.value))}
            className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value={7}>7 ngày cuối của dữ liệu mẫu</option>
            <option value={14}>14 ngày của dữ liệu mẫu</option>
          </select>
        </label>
        <label className="grid min-w-56 gap-2 text-xs font-medium text-slate-500">
          Tổ chức
          <select
            value={organization}
            onChange={(event) => setOrganization(event.target.value)}
            className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Tất cả tổ chức</option>
            {organizations.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={exportDemo}
          className="min-h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          Tải CSV mẫu
        </button>
        <span
          className="ml-auto self-center text-xs text-slate-500"
          role="status"
        >
          {total.toLocaleString("vi-VN")} lượt xử lý minh họa
        </span>
      </section>
      <div className="grid gap-5 xl:grid-cols-2">
        <article className="overflow-hidden rounded-2xl border border-blue-100 bg-[#f7faff] xl:col-span-2">
          <header className="border-b border-blue-100 p-5">
            <h2 className="text-sm font-semibold">Hoạt động xử lý AI</h2>
            <p className="mt-1 text-xs text-slate-500">
              {success.toLocaleString("vi-VN")} thành công ·{" "}
              {failed.toLocaleString("vi-VN")} thất bại · Tỷ lệ thành công{" "}
              {total
                ? ((success / total) * 100).toLocaleString("vi-VN", {
                    maximumFractionDigits: 1,
                  })
                : 0}
              %
            </p>
          </header>
          <div className="p-5">
            <div className="mb-4 flex gap-5 text-xs text-slate-600">
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-sm bg-blue-500" />
                Thành công
              </span>
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-sm bg-rose-400" />
                Thất bại
              </span>
            </div>
            <div className="overflow-x-auto pb-2">
              <div className="flex h-52 min-w-[560px] items-end gap-2 border-b border-l border-blue-100 px-3">
                {daily.map((item) => (
                  <div
                    key={item.day}
                    role="img"
                    tabIndex={0}
                    aria-label={`${item.day}: ${item.success} tác vụ thành công, ${item.failed} tác vụ thất bại`}
                    className="flex h-full flex-1 items-end justify-center gap-1 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    title={`${item.day}: ${item.success} thành công, ${item.failed} thất bại`}
                  >
                    <span
                      className="w-2/5 rounded-t bg-blue-500"
                      style={{ height: `${(item.success / maxDaily) * 100}%` }}
                    />
                    <span
                      className="w-2/5 rounded-t bg-rose-400"
                      style={{ height: `${(item.failed / maxDaily) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex min-w-[560px] gap-2 px-3 text-[10px] text-slate-500">
                {daily.map((item) => (
                  <span key={item.day} className="flex-1 text-center">
                    {item.day}
                  </span>
                ))}
              </div>
            </div>
            <details className="mt-4 rounded-lg border border-blue-100 bg-white/70 px-4 py-3 text-sm">
              <summary className="cursor-pointer font-medium text-blue-800 focus-visible:outline-2 focus-visible:outline-blue-600">
                Xem bảng số liệu mẫu theo ngày
              </summary>
              <div className="mt-3 max-h-56 overflow-auto">
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
            <p className="mt-4 border-t border-blue-100 pt-4 text-xs text-slate-500">
              Dữ liệu minh họa · Chiều cao cột và tỷ lệ cùng tính từ bộ lọc hiện
              tại
            </p>
          </div>
        </article>
        <article className="overflow-hidden rounded-2xl border border-amber-100 bg-[#fffaf2]">
          <header className="border-b border-amber-100 p-5">
            <h2 className="text-sm font-semibold">Phân bố rủi ro hợp đồng</h2>
            <p className="mt-1 text-xs text-slate-500">
              {riskTotal.toLocaleString("vi-VN")} hợp đồng minh họa
            </p>
          </header>
          <div className="flex min-h-64 flex-wrap items-center justify-center gap-8 p-5">
            <div className="relative size-36 shrink-0">
              <svg
                viewBox="0 0 42 42"
                className="size-full -rotate-90"
                role="img"
                aria-label={risk
                  .map((item) => `${item.label}: ${item.value}`)
                  .join(", ")}
              >
                {risk.map((item) => {
                  const start = offset;
                  const percent = riskTotal
                    ? (item.value / riskTotal) * 100
                    : 0;
                  offset += percent;
                  return (
                    <circle
                      key={item.label}
                      cx="21"
                      cy="21"
                      r="15.9"
                      fill="none"
                      stroke={item.color}
                      strokeWidth="5"
                      pathLength="100"
                      strokeDasharray={`${percent} ${100 - percent}`}
                      strokeDashoffset={-start}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 grid place-content-center text-center">
                <strong className="text-2xl font-semibold tabular-nums">
                  {riskTotal}
                </strong>
                <span className="text-[11px] text-slate-500">hợp đồng</span>
              </div>
            </div>
            <dl className="grid min-w-40 gap-3 text-sm">
              {risk.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-5"
                >
                  <dt className="flex items-center gap-2 text-slate-600">
                    <span className={`size-2.5 rounded-sm ${item.tone}`} />
                    {item.label}
                  </dt>
                  <dd className="font-semibold tabular-nums">
                    {item.value.toLocaleString("vi-VN")} ·{" "}
                    {riskTotal ? Math.round((item.value / riskTotal) * 100) : 0}
                    %
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="border-t border-amber-100 px-5 py-4 text-xs text-slate-500">
            Dữ liệu minh họa · Chờ API thống kê hợp đồng
          </p>
        </article>
        <article className="overflow-hidden rounded-2xl border border-emerald-100 bg-[#f4faf8]">
          <header className="border-b border-emerald-100 p-5">
            <h2 className="text-sm font-semibold">Mức sử dụng theo tổ chức</h2>
            <p className="mt-1 text-xs text-slate-500">
              Số lượt xử lý trong khoảng thời gian đã chọn
            </p>
          </header>
          <div className="grid min-h-64 content-center gap-5 p-5">
            {usage.map((item) => (
              <div
                key={item.name}
                className="grid grid-cols-[100px_minmax(0,1fr)_40px] items-center gap-3"
              >
                <span
                  className="truncate text-xs font-medium text-slate-600"
                  title={item.name}
                >
                  {item.name}
                </span>
                <span className="h-2.5 overflow-hidden rounded-full bg-emerald-100">
                  <span
                    className="block h-full rounded-full bg-emerald-500"
                    style={{ width: `${(item.total / maxUsage) * 100}%` }}
                  />
                </span>
                <span className="text-right text-xs font-semibold tabular-nums text-slate-600">
                  {item.total}
                </span>
              </div>
            ))}
          </div>
          <p className="border-t border-emerald-100 px-5 py-4 text-xs text-slate-500">
            Dữ liệu minh họa · Chờ API mức sử dụng
          </p>
        </article>
      </div>
    </>
  );
}
