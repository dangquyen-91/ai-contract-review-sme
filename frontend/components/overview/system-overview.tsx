import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { SystemOverviewCharts } from "@/components/overview/system-overview-charts";
import { sections } from "@/config/management-sections";

export function SystemOverview() {
  const metrics = [
    {
      label: "Tổ chức",
      href: "reports",
      icon: "building",
      tone: "border-blue-100 bg-[#f4f8ff]",
      iconTone: "bg-blue-100 text-blue-700",
      value: String(sections.organizations.rows.length),
      detail: "Tổ chức trong bản demo",
    },
    {
      label: "Người dùng",
      href: "management",
      icon: "team",
      tone: "border-emerald-100 bg-[#f3faf8]",
      iconTone: "bg-emerald-100 text-emerald-700",
      value: String(sections.users.rows.length),
      detail: "Người dùng trong bản demo",
    },
    {
      label: "AI đang xử lý",
      href: "ai-jobs",
      icon: "sparkle",
      tone: "border-amber-100 bg-[#fffaf0]",
      iconTone: "bg-amber-100 text-amber-700",
      value: String(
        sections["ai-jobs"].rows.filter((row) => row[2] === "Đang xử lý")
          .length,
      ),
      detail: "Đang xử lý trong bản demo",
      query: "?status=%C4%90ang%20x%E1%BB%AD%20l%C3%BD",
    },
    {
      label: "Tác vụ thất bại",
      href: "ai-jobs",
      icon: "document",
      tone: "border-rose-100 bg-[#fff7f8]",
      iconTone: "bg-rose-100 text-rose-700",
      value: String(
        sections["ai-jobs"].rows.filter((row) => row[2] === "Thất bại").length,
      ),
      detail: "Thất bại trong bản demo",
      query: "?status=Th%E1%BA%A5t%20b%E1%BA%A1i",
    },
  ] as const;
  return (
    <>
      <section className="relative mb-7 overflow-hidden rounded-[20px] border border-[#d6e4fb] bg-[#eaf2ff] px-6 py-7 sm:px-8 sm:py-9">
        <div
          aria-hidden="true"
          className="absolute -right-16 -top-28 size-72 rounded-full border-[38px] border-white/45"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-20 right-36 size-40 rounded-full border border-blue-300/35"
        />
        <div className="relative grid items-end gap-7 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-blue-700">
              Không gian quản trị
            </p>
            <h1 className="mt-3 max-w-3xl text-[32px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#14213d] sm:text-[42px]">
              Trung tâm điều hành LawScan
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#526783]">
              Theo dõi dữ liệu pháp lý, tình trạng hệ thống và chuẩn bị các báo
              cáo quản trị trong một không gian thống nhất.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/admin/reports"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#245bd6] px-4 text-sm font-semibold text-white transition hover:bg-[#1e4fbd] active:scale-[0.98]"
              >
                Xem báo cáo <Icon name="arrow" className="size-4" />
              </Link>
            </div>
          </div>
          <div className="rounded-xl border border-white/80 bg-white/65 p-5 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
              Phạm vi hiện tại
            </p>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="size-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_#dff4ec]" />
                <span className="text-slate-700">Kho pháp lý đã kết nối</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="size-2.5 rounded-full bg-amber-400 shadow-[0_0_0_4px_#fff0c7]" />
                <span className="text-slate-700">
                  Số liệu quản trị đang minh họa
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section
        aria-label="Chỉ số hệ thống"
        className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((metric) => (
          <Link
            key={metric.label}
            href={`/admin/${metric.href}${"query" in metric ? metric.query : ""}`}
            className={`group relative overflow-hidden rounded-2xl border p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_-32px_rgb(30_70_135_/_0.45)] active:scale-[0.99] ${metric.tone}`}
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-slate-700">
                {metric.label}
              </span>
              <span
                className={`grid size-9 place-items-center rounded-lg ${metric.iconTone}`}
              >
                <Icon name={metric.icon} className="size-[18px]" />
              </span>
            </div>
            <p className="my-4 text-3xl font-semibold tabular-nums text-slate-900">
              {metric.value}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{metric.detail}</span>
              <Icon
                name="arrow"
                className="size-4 text-slate-400 group-hover:text-blue-700"
              />
            </div>
          </Link>
        ))}
      </section>
      <div className="mb-5 flex items-center gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700 ring-1 ring-inset ring-amber-600/15">
          Dữ liệu minh họa
        </span>
        Các KPI quản trị sẽ được thay bằng dữ liệu API.
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-[0_18px_42px_-38px_rgb(120_78_20_/_0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-[#fff8ec] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-800"
              >
                <Icon name="shield" className="size-5" />
              </span>
              <div>
                <h2 className="font-semibold text-slate-900">
                  Cần xử lý{" "}
                  <span className="ml-1 inline-flex min-w-6 justify-center rounded-md bg-amber-200/70 px-1.5 py-0.5 align-middle text-xs text-amber-900">
                    3
                  </span>
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Sự kiện minh họa đang cần admin kiểm tra
                </p>
              </div>
            </div>
            <Link
              href="/admin/ai-jobs?status=Th%E1%BA%A5t%20b%E1%BA%A1i"
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              Xem tác vụ lỗi →
            </Link>
          </div>
          <ul className="grid gap-3 p-4 sm:p-5">
            {[
              {
                title: "Tác vụ AI xử lý thất bại",
                detail: "AI-241009-126 · An Phát Logistics",
                priority: "Cao",
                href: "/admin/ai-jobs?item=AI-241009-126",
                tone: "border-rose-200 border-l-rose-500 bg-rose-50/70",
                badge: "bg-rose-100 text-rose-800",
              },
              {
                title: "Tài khoản bị khóa",
                detail: "ha@horizon.vn · cần kiểm tra",
                priority: "Thấp",
                href: "/admin/users?item=V%C5%A9%20Thanh%20H%C3%A0",
                tone: "border-blue-200 border-l-blue-500 bg-blue-50/60",
                badge: "bg-blue-100 text-blue-800",
              },
            ].map(({ title, detail, priority, href, tone, badge }) => (
              <li key={title}>
                <Link
                  href={href}
                  className={`group block rounded-xl border border-l-4 p-4 transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${tone}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {title}
                    </h3>
                    <span
                      className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${badge}`}
                    >
                      {priority}
                    </span>
                  </div>
                  <p className="mt-2 break-words text-xs leading-5 text-slate-600">
                    {detail}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 group-hover:underline">
                    Mở chi tiết <Icon name="arrow" className="size-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-6 shadow-[0_18px_42px_-38px_rgb(30_70_135_/_0.35)]">
          <p className="mb-5 text-xs font-medium uppercase tracking-wider text-slate-500">
            Truy cập nhanh
          </p>
          {[
            {
              href: "users",
              title: "Tra cứu người dùng",
              detail: "Tài khoản và vai trò",
              icon: "team",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={`/admin/${item.href}`}
              className="group flex items-center gap-3 border-t border-slate-100 py-5 first:border-0"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500">
                <Icon
                  name={item.icon as "building" | "team" | "scales"}
                  className="size-5"
                />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-medium group-hover:text-blue-700">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {item.detail}
                </p>
              </div>
              <Icon
                name="diagonal"
                className="ml-auto size-4 shrink-0 text-slate-400"
              />
            </Link>
          ))}
        </section>
      </div>
      <SystemOverviewCharts />
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_42px_-40px_rgb(30_70_135_/_0.32)]">
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <h2 className="font-semibold">Hoạt động quản trị gần đây</h2>
          <Link
            href="/admin/audit-log"
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            Xem nhật ký
          </Link>
        </div>
        <ul className="divide-y divide-slate-100 px-6">
          {[
            [
              "Cập nhật nguồn pháp lý",
              "Luật Thương mại 2005",
              "09/10/2026 10:32",
            ],
            ["Khóa tài khoản người dùng", "ha@horizon.vn", "09/10/2026 09:48"],
            ["Xác minh tổ chức", "Nova Retail", "08/10/2026"],
          ].map(([action, subject, time]) => (
            <li
              key={`${action}-${subject}`}
              className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-5"
            >
              <span className="text-sm font-medium text-slate-800">
                {action}
              </span>
              <span className="truncate text-sm text-slate-500">{subject}</span>
              <time className="text-xs text-slate-400">{time}</time>
            </li>
          ))}
        </ul>
        <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-3 text-xs text-slate-500">
          Dữ liệu minh họa · Chưa kết nối nhật ký backend
        </div>
      </section>
    </>
  );
}
