import Link from "next/link";
import { ClipboardCheck, Files, Inbox } from "lucide-react";

export function VerificationOverviewMetrics({
  assigned,
  waiting,
  assignedPending = false,
  waitingPending = false,
}: {
  assigned?: number;
  waiting?: number;
  assignedPending?: boolean;
  waitingPending?: boolean;
}) {
  const items = [
    {
      label: "Yêu cầu đang theo dõi",
      value:
        assigned !== undefined && waiting !== undefined
          ? assigned + waiting
          : undefined,
      pending: assignedPending || waitingPending,
      href: "/expert-verification",
      icon: Files,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      label: "Tôi đang xử lý",
      value: assigned,
      pending: assignedPending,
      href: "/expert-verification?status=in_progress",
      icon: ClipboardCheck,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Chờ tiếp nhận",
      value: waiting,
      pending: waitingPending,
      href: "/expert-verification?status=requested",
      icon: Inbox,
      tone: "bg-amber-50 text-amber-800",
    },
  ];
  return (
    <section
      aria-label="Tình trạng công việc xác minh"
      className="grid gap-3.5 sm:grid-cols-3"
    >
      {items.map(({ label, value, pending, href, icon: Icon, tone }) => (
        <Link
          key={href}
          href={href}
          className="flex min-w-0 items-center gap-4 rounded-2xl border border-[#e1e8f2] bg-card p-5 shadow-[0_12px_26px_-25px_#4b668b] outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        >
          <span
            className={`grid size-12 shrink-0 place-items-center rounded-xl ${tone}`}
          >
            <Icon className="size-[22px]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="m-0 text-ui-meta font-semibold text-muted-foreground">
              {label}
            </h2>
            {pending && value === undefined ? (
              <div
                role="status"
                aria-label="Đang tải số lượng"
                className="mt-2 h-8 w-16 animate-pulse rounded bg-muted motion-reduce:animate-none"
              />
            ) : (
              <p className="mb-0 mt-1 text-[29px] font-bold leading-tight tracking-tight tabular-nums">
                {value === undefined ? "—" : value.toLocaleString("vi-VN")}
              </p>
            )}
            <p className="mb-0 mt-1 text-ui-caption text-muted-foreground">
              {!pending && value === undefined
                ? "Chưa tải đủ dữ liệu"
                : "Theo danh sách đã tải"}
            </p>
          </div>
        </Link>
      ))}
    </section>
  );
}
