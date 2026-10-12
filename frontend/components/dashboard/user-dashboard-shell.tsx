"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Brand } from "@/components/ui/brand";
import { DashboardNavigation, DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { getDashboardNavigation } from "@/config/navigation-config";
import { Icon } from "@/components/ui/icon";
import { useLogoutMutation } from "@/hooks/use-auth";
import { isApiClientError } from "@/lib/api/client";
import { useDashboardOverview } from "@/hooks/use-dashboard";
import type { DashboardData } from "@/types/dashboard";

export type UserDashboardContext = { data: DashboardData; access: { upload: boolean; review: boolean; administer: boolean }; roleLabel: string };

const roleAccess: Record<string, { upload: boolean; review: boolean; administer: boolean }> = {
  administrator: { upload: true, review: true, administer: true },
  owner: { upload: true, review: true, administer: true },
  manager: { upload: true, review: true, administer: false },
  staff: { upload: true, review: true, administer: false },
  reviewer: { upload: false, review: true, administer: false },
  user: { upload: true, review: true, administer: false },
};

const roleLabels: Record<string, string> = {
  administrator: "Quản trị viên", owner: "Chủ tổ chức", manager: "Quản lý",
  staff: "Nhân viên", reviewer: "Chuyên viên rà soát", user: "Người dùng",
};

function initials(name?: string) {
  if (!name) return "LS";
  return name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase();
}

function DashboardSkeleton() {
  return <div className="min-h-dvh [background:#f6f7f9] px-[max(5vw,28px)] py-20" aria-label="Đang tải dashboard" aria-busy="true"><div className="block [background:linear-gradient(90deg,#e7ebf0_25%,#f3f5f7_50%,#e7ebf0_75%)] animate-[shimmer_1.3s_infinite] rounded-xl [background-size:200%_100%] w-[min(440px,70%)] h-[75px] motion-reduce:animate-none" /><div className="[&_i]:block [&_i]:[background:linear-gradient(90deg,#e7ebf0_25%,#f3f5f7_50%,#e7ebf0_75%)] [&_i]:animate-[shimmer_1.3s_infinite] [&_i]:rounded-xl [&_i]:[background-size:200%_100%] grid grid-cols-[repeat(4,1fr)] gap-2 mt-7 [&_i]:h-[90px] [&_i]:motion-reduce:animate-none">{Array.from({ length: 4 }, (_, index) => <i key={index} />)}</div><div className="[&_i]:block [&_i]:[background:linear-gradient(90deg,#e7ebf0_25%,#f3f5f7_50%,#e7ebf0_75%)] [&_i]:animate-[shimmer_1.3s_infinite] [&_i]:rounded-xl [&_i]:[background-size:200%_100%] grid grid-cols-[1.65fr_0.58fr] gap-5 mt-5 [&_i]:h-[420px] [&_i]:motion-reduce:animate-none"><i /><i /></div></div>;
}

export function UserDashboardShell({ view, children }: { view: "review" | "contract"; children: (context: UserDashboardContext) => ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const logoutMutation = useLogoutMutation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { data, error, isLoading, refetch } = useDashboardOverview();
  const access = roleAccess[data?.role ?? "user"] ?? roleAccess.user;
  const profileInitials = initials(data?.user?.name);

  async function logout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try { await logoutMutation.mutateAsync(); queryClient.clear(); router.replace("/dang-nhap"); router.refresh(); }
    catch { setIsLoggingOut(false); toast.error("Không thể đăng xuất. Vui lòng thử lại."); }
  }

  if (isLoading) return <DashboardSkeleton />;
  if (error || !data) {
    const needsOrganization = isApiClientError(error) && error.status === 403;
    return <section className="min-h-dvh flex flex-col items-center justify-center text-[color:var(--ink)] [background:#f6f7f9] text-center p-7 [&>_span]:w-14 [&>_span]:h-14 [&>_span]:grid [&>_span]:place-items-center [&>_span]:text-[color:var(--accent)] [&>_span]:[background:#e8f0ff] [&>_span]:rounded-[15px] [&_h1]:text-[length:27px] [&_h1]:mt-[18px] [&_h1]:mb-0 [&_h1]:mx-0 [&_p]:max-w-[470px] [&_p]:text-[color:var(--muted)] [&_p]:text-[length:12px] [&_p]:leading-[1.6] [&_p]:mt-2 [&_p]:mb-0 [&_p]:mx-0 [&_:is(a,_button)]:min-h-[43px] [&_:is(a,_button)]:inline-flex [&_:is(a,_button)]:items-center [&_:is(a,_button)]:gap-3 [&_:is(a,_button)]:text-[white] [&_:is(a,_button)]:[background:var(--accent)] [&_:is(a,_button)]:[font:inherit] [&_:is(a,_button)]:cursor-pointer [&_:is(a,_button)]:mt-5 [&_:is(a,_button)]:px-[15px] [&_:is(a,_button)]:py-0 [&_:is(a,_button)]:rounded-[9px] [&_:is(a,_button)]:border-0 [&_:is(a,_button)]:border-none [&_:is(a,_button)]:border-current [&_:is(a,_button)]:[font-size:10px] [&_:is(a,_button)]:[font-weight:700] [&_svg]:w-4"><span><Icon name="document" /></span><h1>Chưa thể mở không gian làm việc</h1><p>{isApiClientError(error) ? error.message : "Không thể tải dữ liệu. Vui lòng thử lại."}</p>{needsOrganization ? <Link href="/chon-to-chuc">Thiết lập tổ chức <Icon name="arrow" /></Link> : <button type="button" onClick={() => refetch()}>Tải lại <Icon name="arrow" /></button>}</section>;
  }

  const roleLabel = roleLabels[data.role] ?? data.role;
  return (
    <div className="[--ink:#14213d] [--muted:#6b778c] [--line:#e4e8ef] [--accent:#2864dc] [--accent-dark:#1f4fb2] [--soft:#f4f7fb] min-h-dvh flex text-[color:var(--ink)] [background:#f6f7f9] [font-family:var(--font-geist-sans),Arial,sans-serif] [&_*]:box-border [&_:is(a,_button)]:[text-decoration:none] [&_:is(a,_button,_input,_select,_textarea)]:focus-visible:[outline:3px_solid_#9bbcf8] [&_:is(a,_button,_input,_select,_textarea)]:focus-visible:outline-offset-2 [@media_(max-width:_820px)]:block [&_*]:motion-reduce:!transition-none [&_*::before]:motion-reduce:!transition-none [&_*::after]:motion-reduce:!transition-none">
      <a className="fixed top-[-60px] z-20 text-[color:var(--ink)] [background:white] px-3.5 py-2.5 rounded-lg left-4 focus:top-3" href="#dashboard-content">Đến nội dung chính</a>
      <DashboardSidebar homeHref="/dashboard/user/review" workspaceName={data.organization.name} workspaceLabel="Không gian cá nhân" name={data.user?.name ?? "Tài khoản LawScan"} roleLabel={roleLabel} onLogout={logout} loggingOut={isLoggingOut} items={getDashboardNavigation("user")} activeKey={view} contractCount={data.totalContracts} />

      <div className="min-w-0 flex-1">
        <header className="min-h-[68px] flex items-center justify-between gap-5 [border-bottom:1px_solid_var(--line)] [background:rgb(255_255_255_/_0.94)] px-[clamp(24px,4vw,52px)] py-[13px] [&>_p]:flex [&>_p]:items-center [&>_p]:gap-2.5 [&>_p]:text-[color:var(--muted)] [&>_p]:text-[length:11px] [&>_p_i]:text-[#bdc5d0] [&>_p_i]:not-italic [&>_p_strong]:text-[color:var(--ink)] [@media_(max-width:_820px)]:min-h-[62px] [@media_(max-width:_820px)]:[padding-inline:18px] [&>_p]:[@media_(max-width:_820px)]:hidden"><div className="hidden [@media_(max-width:_820px)]:flex [@media_(max-width:_820px)]:items-center [@media_(max-width:_820px)]:gap-2 [&_.brand-image]:[@media_(max-width:_820px)]:w-[33px] [&_.brand-image]:[@media_(max-width:_820px)]:h-[33px] [&_strong]:[@media_(max-width:_820px)]:text-[length:15px]"><Brand markOnly /><strong>LawScan</strong></div><p><span>{data.organization.name}</span><i>/</i><strong>{view === "review" ? "Tải & rà soát" : "Hợp đồng"}</strong></p><div className="flex items-center gap-[13px]"><span className="min-h-[30px] inline-flex items-center gap-[7px] text-[#345981] border [background:#f6f9fc] text-[length:10px] font-[650] px-2.5 py-0 rounded-[20px] border-solid border-[#d9e4f0] [&_svg]:w-3.5 [@media_(max-width:_820px)]:hidden"><Icon name="shield" />{roleLabel}</span><span className="w-9 h-9 grid place-items-center text-[white] [background:#1b3154] text-[length:10px] font-extrabold rounded-[9px] w-[34px] h-[34px] [@media_(max-width:_820px)]:hidden">{profileInitials}</span><button className="hidden [@media_(max-width:_820px)]:w-[35px] [@media_(max-width:_820px)]:h-[35px] [@media_(max-width:_820px)]:grid [@media_(max-width:_820px)]:place-items-center [@media_(max-width:_820px)]:text-[#607087] [@media_(max-width:_820px)]:border [@media_(max-width:_820px)]:border-[color:var(--line)] [@media_(max-width:_820px)]:[background:white] [@media_(max-width:_820px)]:rounded-[9px] [@media_(max-width:_820px)]:border-solid [&_svg]:[@media_(max-width:_820px)]:w-[15px] [&_svg]:[@media_(max-width:_820px)]:[transform:rotate(180deg)]" type="button" onClick={logout} disabled={isLoggingOut} aria-label="Đăng xuất"><Icon name="arrow" /></button></div></header>
        <DashboardNavigation mobile items={getDashboardNavigation("user")} activeKey={view} />
        <main id="dashboard-content" className="w-[min(1420px,100%)] [margin-inline:auto] pt-[38px] pb-16 px-[clamp(24px,4vw,52px)] [@media_(max-width:_820px)]:pt-[30px] [@media_(max-width:_820px)]:pb-12 [@media_(max-width:_820px)]:px-[18px]">
          {children({ data, access, roleLabel })}
        </main>
      </div>
    </div>
  );
}
