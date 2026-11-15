"use client";

import { useId, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { ReportExportActions } from "@/components/reports/report-export-actions";
import { Button } from "@/components/ui/button";
import { dashboardInsightConfig } from "@/config/dashboard-insights";
import type { DashboardRole } from "@/config/dashboard-roles";
import { permissions } from "@/config/permissions";
import { roleReportConfig } from "@/config/report-profiles";
import type { InsightPeriod } from "@/types/dashboard-insights";
import { useDashboardInsights } from "@/hooks/dashboard/use-dashboard-insights";
import {
  insightCsv,
  formatInsight,
  insightLabel,
} from "@/lib/reports/insight-format";
import { InsightMetrics } from "./insight-metrics";
import { ChartLoading } from "@/components/reports/chart-loading";

const InsightCharts = dynamic(
  () => import("./insight-charts").then((module) => module.InsightCharts),
  { ssr: false, loading: () => <ChartLoading panels={2} /> },
);

export function RoleInsights({
  role,
  scopeId,
  heading = false,
  reportPage = false,
}: {
  role: DashboardRole;
  scopeId?: string;
  heading?: boolean;
  reportPage?: boolean;
}) {
  const [period, setPeriod] = useState<InsightPeriod>("month");
  const query = useDashboardInsights(role, period, scopeId);
  const config = dashboardInsightConfig[role];
  const reportConfig = roleReportConfig[role];
  const title = reportPage ? reportConfig.title : config.title;
  const inputId = useId();
  const data = query.data;
  const ready = !!data && !query.isError;
  const Title = heading ? "h1" : "h2";

  function download() {
    if (!data || !ready) return;
    const url = URL.createObjectURL(
      new Blob([insightCsv(data)], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `lawscan-${role}-${data.period.startDate}-${data.period.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="grid min-w-0 gap-5" aria-label={title}>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-2xl">
          {heading && (
            <p className="mb-2 text-xs font-semibold tracking-wide text-primary">
              LawScan · {reportPage ? "Báo cáo" : "Tổng quan"}
            </p>
          )}
          <Title
            className={
              heading
                ? "text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
                : "text-xl font-semibold tracking-tight"
            }
          >
            {title}
          </Title>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {reportPage ? reportConfig.description : config.description}
          </p>
        </div>
        {!reportPage && permissions.reports(role) && (
          <Button asChild variant="outline">
            <Link href={reportConfig.href}>
              Báo cáo chi tiết <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        )}
      </header>
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl bg-muted/40 p-3 sm:px-4">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor={inputId} className="text-xs font-medium">
            Kỳ thống kê
          </label>
          <select
            id={inputId}
            value={period}
            onChange={(event) => setPeriod(event.target.value as InsightPeriod)}
            className="min-h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
            <option value="quarter">Quý này</option>
            <option value="year">Năm nay</option>
          </select>
          {data && (
            <span className="text-xs text-muted-foreground">
              {data.period.startDate} → {data.period.endDate}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            <RefreshCw className="size-4" />
            Làm mới
          </Button>
          {permissions.reportExport(role) && (
            <ReportExportActions
              source={ready && data ? { kind: "insights", data } : null}
              ready={ready}
              onCsv={download}
            />
          )}
        </div>
      </div>
      {query.isError ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-sm"
        >
          <p>{query.error.message}</p>
          <Button
            className="mt-2"
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
          >
            Thử lại
          </Button>
        </div>
      ) : !data ? (
        <div
          role="status"
          aria-label="Đang tải thống kê"
          className="grid gap-5"
        >
          <div className="h-28 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
          <div className="h-80 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
        </div>
      ) : (
        <>
          <p role="status" className="text-xs leading-5 text-muted-foreground">
            {query.isFetching ? "Đang cập nhật… " : ""}Cập nhật{" "}
            {new Date(data.computedAt).toLocaleString("vi-VN", {
              timeZone: data.timezone,
            })}{" "}
            · Giờ Việt Nam.
            {data.period.partial ? " Kỳ chưa kết thúc." : ""} Chỉ số “Hiện tại”
            không thay đổi theo bộ lọc kỳ.
          </p>
          <InsightMetrics data={data} />
          {(role === "staff" || role === "user") && (
            <section
              className="rounded-xl bg-muted/40 px-5 py-4"
              aria-label="Lượt AI đã dùng trong kỳ"
            >
              <h3 className="text-sm font-semibold">
                Lượt AI đã dùng trong kỳ
              </h3>
              <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-3 text-sm tabular-nums">
                {[
                  { key: "analysisUnits", label: "Rà soát" },
                  { key: "chatUnits", label: "Chat" },
                  { key: "draftingUnits", label: "Soạn hợp đồng" },
                ].map((kind) => (
                  <div key={kind.key} className="flex gap-2">
                    <dt className="text-muted-foreground">{kind.label}</dt>
                    <dd className="font-semibold">
                      {formatInsight(data.metrics[kind.key] ?? 0)}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Chỉ tính lượt đã sử dụng thành công. Một lượt rà soát có thể
                dùng nhiều đơn vị hạn mức tùy số trang.
              </p>
            </section>
          )}
          {config.actions.length > 0 && (
            <nav
              aria-label="Công việc cần theo dõi"
              className="flex flex-wrap gap-x-6 gap-y-3 rounded-xl border border-border px-5 py-4 text-sm"
            >
              {config.actions.map((action) => (
                <Link
                  key={action.key}
                  href={action.href}
                  className="inline-flex items-center gap-2 rounded-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {action.label}
                  <strong className="text-foreground tabular-nums">
                    {formatInsight(data.metrics[action.key])}
                  </strong>
                  <ArrowUpRight className="size-3.5" />
                </Link>
              ))}
            </nav>
          )}
          <InsightCharts data={data} />
          <details className="rounded-xl border border-border p-4 text-sm">
            <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-ring">
              Xem bảng số liệu
            </summary>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <caption className="sr-only">Dữ liệu xu hướng trong kỳ</caption>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="p-3">
                      Ngày / nhóm
                    </th>
                    {config.series.map((series) => (
                      <th key={series.key} scope="col" className="p-3">
                        {series.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.trend.map((row) => (
                    <tr
                      key={row.date}
                      className="border-b border-border last:border-0"
                    >
                      <th
                        scope="row"
                        className="whitespace-nowrap p-3 font-medium"
                      >
                        {row.date}
                      </th>
                      {config.series.map((series) => (
                        <td key={series.key} className="p-3">
                          {formatInsight(
                            typeof row[series.key] === "number"
                              ? (row[series.key] as number)
                              : null,
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="mt-4 grid gap-2 border-t border-border pt-4">
              {data.distribution.map((row) => (
                <div key={row.key} className="flex justify-between gap-4">
                  <dt>{insightLabel(config.labels, row)}</dt>
                  <dd className="tabular-nums">
                    {row.value.toLocaleString("vi-VN")}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
          {role === "expert" && (
            <p className="text-xs leading-5 text-muted-foreground">
              Thời gian xác minh tính từ lúc tiếp nhận đến lúc kết thúc, gồm cả
              thời gian tạm ngưng thao tác. Thống kê đếm toàn bộ lần xác minh
              phù hợp, không giới hạn theo danh sách hiển thị.
            </p>
          )}
          {role === "manager" && (
            <p className="text-xs leading-5 text-muted-foreground">
              Nguồn có cập nhật được tính theo lần cập nhật gần nhất của mỗi
              nguồn, không phải số thao tác chỉnh sửa.
            </p>
          )}
        </>
      )}
    </section>
  );
}
