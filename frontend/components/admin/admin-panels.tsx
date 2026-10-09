import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
        {eyebrow}
      </p>
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export function EmptyState({
  title = "Dữ liệu chưa sẵn sàng",
  description,
  icon = "document",
}: {
  title?: string;
  description: string;
  icon?: React.ComponentProps<typeof Icon>["name"];
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-5 grid size-14 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
        <Icon name={icon} className="size-6" />
      </span>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export const sections = {
  organizations: {
    title: "Tổ chức",
    description:
      "Tra cứu các tổ chức sử dụng LawScan và thông tin hoạt động của từng tổ chức.",
    icon: "building",
    columns: ["Tổ chức", "Mã số thuế", "Chủ sở hữu", "Trạng thái", "Ngày tạo"],
  },
  users: {
    title: "Người dùng",
    description:
      "Theo dõi tài khoản, vai trò và tổ chức của người dùng trên toàn hệ thống.",
    icon: "team",
    columns: ["Người dùng", "Email", "Vai trò", "Tổ chức", "Trạng thái"],
  },
  "ai-jobs": {
    title: "Giám sát AI",
    description:
      "Theo dõi quá trình xử lý hợp đồng và các tác vụ cần kiểm tra.",
    icon: "sparkle",
    columns: [
      "Mã tác vụ",
      "Tổ chức",
      "Trạng thái",
      "Thời gian xử lý",
      "Bắt đầu",
    ],
  },
  "audit-log": {
    title: "Nhật ký quản trị",
    description:
      "Tra cứu các thay đổi và thao tác quản trị trên toàn hệ thống.",
    icon: "shield",
    columns: [
      "Người thực hiện",
      "Thao tác",
      "Đối tượng",
      "Kết quả",
      "Thời điểm",
    ],
  },
} as const;

export function UnavailableSection({
  section,
}: {
  section: keyof typeof sections;
}) {
  const config = sections[section];
  return (
    <>
      <PageHeading
        eyebrow={
          section === "organizations" || section === "users"
            ? "Quản lý"
            : "Vận hành"
        }
        title={config.title}
        description={config.description}
      />
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <h2 className="text-sm font-semibold">
            {config.title === "Nhật ký quản trị"
              ? "Lịch sử hoạt động"
              : `Danh sách ${config.title.toLowerCase()}`}
          </h2>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
            Chưa có dữ liệu
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-xs text-slate-500">
              <tr>
                {config.columns.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="px-6 py-4 font-medium"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={config.columns.length}>
                  <EmptyState
                    icon={config.icon}
                    description="Thông tin sẽ xuất hiện tại đây khi dữ liệu quản trị được cung cấp."
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <p className="mt-4 text-xs leading-5 text-slate-500">
        Các thao tác tra cứu và quản lý sẽ khả dụng khi danh sách được kết nối.
      </p>
    </>
  );
}

export function AdminOverview() {
  const metrics = [
    { label: "Tổ chức", href: "organizations", icon: "building" },
    { label: "Người dùng", href: "users", icon: "team" },
    { label: "AI đang xử lý", href: "ai-jobs", icon: "sparkle" },
    { label: "Tác vụ thất bại", href: "ai-jobs", icon: "document" },
  ] as const;
  return (
    <>
      <PageHeading
        eyebrow="Không gian quản trị"
        title="Tổng quan hệ thống"
        description="Nắm bắt hoạt động của LawScan, theo dõi tổ chức và những vấn đề cần xử lý."
      />
      <section
        aria-label="Chỉ số hệ thống"
        className="mb-8 grid grid-cols-1 overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((metric) => (
          <Link
            key={metric.label}
            href={`/dashboard/admin/${metric.href}`}
            className="group border-b border-slate-100 p-6 transition-colors last:border-b-0 hover:bg-slate-50 sm:border-r xl:border-b-0"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-600">{metric.label}</span>
              <Icon name={metric.icon} className="size-[18px] text-slate-400" />
            </div>
            <p
              className="my-4 text-3xl font-medium tabular-nums text-slate-300"
              aria-label="Chưa có số liệu"
            >
              —
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Chưa có số liệu</span>
              <Icon
                name="arrow"
                className="size-4 text-slate-400 group-hover:text-blue-700"
              />
            </div>
          </Link>
        ))}
      </section>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-6">
            <div>
              <h2 className="font-semibold">Cần xử lý</h2>
              <p className="mt-1 text-xs text-slate-500">
                Tác vụ thất bại và hoạt động cần kiểm tra
              </p>
            </div>
            <Link
              href="/dashboard/admin/ai-jobs"
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              Xem tác vụ
            </Link>
          </div>
          <EmptyState
            icon="sparkle"
            title="Chưa có dữ liệu giám sát"
            description="Các tác vụ cần chú ý sẽ được tổng hợp tại đây khi có dữ liệu vận hành."
          />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="mb-5 text-xs font-medium uppercase tracking-wider text-slate-500">
            Truy cập nhanh
          </p>
          {[
            {
              href: "organizations",
              title: "Quản lý tổ chức",
              detail: "Không gian làm việc trên hệ thống",
              icon: "building",
            },
            {
              href: "users",
              title: "Tra cứu người dùng",
              detail: "Tài khoản và vai trò",
              icon: "team",
            },
            {
              href: "legal-sources",
              title: "Kho dữ liệu pháp lý",
              detail: "Văn bản và nguồn tham chiếu",
              icon: "scales",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={`/dashboard/admin/${item.href}`}
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
      <section className="mt-6 rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <h2 className="font-semibold">Hoạt động quản trị gần đây</h2>
          <Link
            href="/dashboard/admin/audit-log"
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            Xem nhật ký
          </Link>
        </div>
        <div className="px-6 py-10 text-sm text-slate-500">
          Chưa có dữ liệu nhật ký để hiển thị.
        </div>
      </section>
    </>
  );
}
