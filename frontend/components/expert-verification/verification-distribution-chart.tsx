import Link from "next/link";

export function VerificationDistributionChart({ assigned, waiting, pending, unavailable }: {
  assigned?: number;
  waiting?: number;
  pending: boolean;
  unavailable: boolean;
}) {
  const ready = assigned !== undefined && waiting !== undefined;
  const total = (assigned ?? 0) + (waiting ?? 0);
  const share = total ? (assigned ?? 0) / total * 100 : 0;
  const items = [
    { label: "Tôi đang xử lý", value: assigned ?? 0, href: "/expert-verification?status=in_progress", color: "#2864dc" },
    { label: "Chờ tiếp nhận", value: waiting ?? 0, href: "/expert-verification?status=requested", color: "#d69a32" },
  ];
  return (
    <section aria-labelledby="verification-distribution-title" className="min-w-0 rounded-[18px] border border-[#e1e8f2] bg-card p-5 shadow-[0_18px_35px_-34px_#4b668b] sm:p-6">
      <h2 id="verification-distribution-title" className="m-0 text-ui-card font-bold tracking-tight">Phân bố công việc</h2>
      <p className="mb-0 mt-2 text-ui-meta leading-6 text-muted-foreground">Hàng đợi chờ chung và yêu cầu bạn đang xử lý.</p>
      {pending || unavailable || !ready || total === 0 ? (
        <p role="status" className="grid min-h-56 content-center text-center text-ui leading-6 text-muted-foreground">{pending ? "Đang tải dữ liệu biểu đồ…" : unavailable || !ready ? "Chưa cập nhật được dữ liệu biểu đồ. Bạn có thể thử làm mới." : "Chưa có yêu cầu để thống kê. Biểu đồ sẽ xuất hiện khi có dữ liệu."}</p>
      ) : (
        <>
          <div aria-hidden="true" className="mx-auto my-6 grid size-[168px] place-items-center rounded-full animate-in fade-in duration-300 motion-reduce:animate-none" style={{ background: `conic-gradient(#2864dc 0% ${share}%, #d69a32 ${share}% 100%)` }}>
            <div className="grid size-[123px] place-content-center rounded-full bg-card text-center"><strong className="text-3xl font-bold tabular-nums">{total.toLocaleString("vi-VN")}</strong><span className="mt-1 text-ui-caption text-muted-foreground">yêu cầu đã tải</span></div>
          </div>
          <ul className="m-0 list-none space-y-1 p-0">
            {items.map((item) => (
              <li key={item.href}><Link href={item.href} aria-label={`${item.label}: ${item.value} yêu cầu trong dữ liệu đã tải. Xem danh sách`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-3 text-ui outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"><span className="flex items-center gap-2"><span aria-hidden="true" className="size-2.5 shrink-0 rounded-sm" style={{ background: item.color }} />{item.label}</span><span className="flex items-center gap-3"><span className="text-ui-caption tabular-nums text-muted-foreground">{Math.round(item.value / total * 100)}%</span><strong className="tabular-nums">{item.value}</strong></span></Link></li>
            ))}
          </ul>
        </>
      )}
      <p className="mb-0 mt-4 border-t border-border pt-4 text-ui-caption leading-5 text-muted-foreground">Theo dữ liệu đã tải, tối đa 100 yêu cầu mỗi nhóm. Chọn một nhóm để mở danh sách tương ứng.</p>
    </section>
  );
}
