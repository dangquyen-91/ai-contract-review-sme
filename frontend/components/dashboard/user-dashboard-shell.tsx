"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import typography from "./dashboard-typography.module.css";
import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";
import { authApi } from "@/lib/api/auth";
import { isApiClientError } from "@/lib/api/client";
import { dashboardApi } from "@/lib/api/dashboard";
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      try { return await dashboardApi.getOverview(); }
      catch (requestError) {
        if (isApiClientError(requestError) && requestError.status === 403) {
          await authApi.refreshToken();
          return dashboardApi.getOverview();
        }
        throw requestError;
      }
    },
    retry: false,
    refetchInterval: (query) => query.state.data?.stats.processing ? 30_000 : false,
  });
  const access = roleAccess[data?.role ?? "user"] ?? roleAccess.user;
  const profileInitials = initials(data?.user?.name);

  async function logout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try { await authApi.logout(); queryClient.clear(); router.replace("/dang-nhap"); router.refresh(); }
    catch { setIsLoggingOut(false); toast.error("Không thể đăng xuất. Vui lòng thử lại."); }
  }

  if (isLoading) return <DashboardSkeleton />;
  if (error || !data) {
    const needsOrganization = isApiClientError(error) && error.status === 403;
    return <section className="min-h-dvh flex flex-col items-center justify-center text-[color:var(--ink)] [background:#f6f7f9] text-center p-7 [&>_span]:w-14 [&>_span]:h-14 [&>_span]:grid [&>_span]:place-items-center [&>_span]:text-[color:var(--accent)] [&>_span]:[background:#e8f0ff] [&>_span]:rounded-[15px] [&_h1]:text-ui-title [&_h1]:mt-[18px] [&_h1]:mb-0 [&_h1]:mx-0 [&_p]:max-w-[470px] [&_p]:text-[color:var(--muted)] [&_p]:text-ui-caption [&_p]:leading-[1.6] [&_p]:mt-2 [&_p]:mb-0 [&_p]:mx-0 [&_:is(a,_button)]:min-h-[43px] [&_:is(a,_button)]:inline-flex [&_:is(a,_button)]:items-center [&_:is(a,_button)]:gap-3 [&_:is(a,_button)]:text-[white] [&_:is(a,_button)]:[background:var(--accent)] [&_:is(a,_button)]:[font:inherit] [&_:is(a,_button)]:cursor-pointer [&_:is(a,_button)]:mt-5 [&_:is(a,_button)]:px-[15px] [&_:is(a,_button)]:py-0 [&_:is(a,_button)]:rounded-[9px] [&_:is(a,_button)]:border-0 [&_:is(a,_button)]:border-none [&_:is(a,_button)]:border-current [&_:is(a,_button)]:text-ui [&_:is(a,_button)]:[font-weight:700] [&_svg]:w-4"><span><Icon name="document" /></span><h1>Chưa thể mở không gian làm việc</h1><p>{isApiClientError(error) ? error.message : "Không thể tải dữ liệu. Vui lòng thử lại."}</p>{needsOrganization ? <Link href="/chon-to-chuc">Thiết lập tổ chức <Icon name="arrow" /></Link> : <button type="button" onClick={() => refetch()}>Tải lại <Icon name="arrow" /></button>}</section>;
  }

  const roleLabel = roleLabels[data.role] ?? data.role;
  return (
    <div className={`${typography.shell} [--ink:#14213d] [--muted:#6b778c] [--line:#e4e8ef] [--accent:#2864dc] [--accent-dark:#1f4fb2] [--soft:#f4f7fb] min-h-dvh flex text-[color:var(--ink)] [background:#f6f7f9] [font-family:var(--font-geist-sans),Arial,sans-serif] [&_*]:box-border [&_:is(a,_button)]:[text-decoration:none] [&_:is(a,_button,_input,_select,_textarea)]:focus-visible:[outline:3px_solid_#9bbcf8] [&_:is(a,_button,_input,_select,_textarea)]:focus-visible:outline-offset-2 [@media_(max-width:_820px)]:block [&_*]:motion-reduce:!transition-none [&_*::before]:motion-reduce:!transition-none [&_*::after]:motion-reduce:!transition-none`}>
      <a className="fixed top-[-60px] z-20 text-[color:var(--ink)] [background:white] px-3.5 py-2.5 rounded-lg left-4 focus:top-3" href="#dashboard-content">Đến nội dung chính</a>
      <aside className="sticky w-[252px] h-dvh flex flex-none flex-col [border-right:1px_solid_var(--line)] [background:#fff] pt-[22px] pb-[18px] px-4 top-0 [@media_(max-width:_1100px)]:w-[218px] [@media_(max-width:_820px)]:hidden">
        <Link className="w-fit pl-2 [&_.brand-image]:w-[150px] [&_.brand-image]:h-[52px] [&_.brand-image_img]:top-[-18px] [&_.brand-image_img]:w-[154px] [&_.brand-image_img]:h-[84px]" href="/dashboard/user/review" aria-label="LawScan dashboard"><Brand /></Link>
        <div className="grid grid-cols-[38px_minmax(0,1fr)] items-center gap-2.5 border [background:#f8fafc] mt-[22px] p-[11px] rounded-[11px] border-solid border-[#dbe3ed] [&>_span]:w-[38px] [&>_span]:h-[38px] [&>_span]:grid [&>_span]:place-items-center [&>_span]:text-[color:var(--accent)] [&>_span]:[background:#eaf1ff] [&>_span]:rounded-[9px] [&_svg]:w-[18px] [&_strong]:block [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_small]:block [&_small]:overflow-hidden [&_small]:text-ellipsis [&_small]:whitespace-nowrap [&_strong]:text-ui [&_small]:text-[color:var(--muted)] [&_small]:text-ui-meta [&_small]:mt-0.5"><span><Icon name={data.role === "user" ? "user" : "building"} /></span><div><strong>{data.organization.name}</strong><small>{data.role === "user" ? "Không gian cá nhân" : "Không gian làm việc"}</small></div></div>
        <nav className="grid gap-1 mt-[22px] [&_p]:text-[#929baa] [&_p]:text-ui-caption [&_p]:font-semibold [&_p]:tracking-[0.9px] [&_p]:uppercase [&_p]:mt-[18px] [&_p]:mb-1.5 [&_p]:mx-2.5 [&_p]:first:mt-0 [&_:is(a,_button)]:w-full [&_:is(a,_button)]:min-h-[42px] [&_:is(a,_button)]:flex [&_:is(a,_button)]:items-center [&_:is(a,_button)]:gap-[11px] [&_:is(a,_button)]:text-[#5f6d82] [&_:is(a,_button)]:[background:transparent] [&_:is(a,_button)]:[font-family:inherit] [&_:is(a,_button)]:text-left [&_:is(a,_button)]:cursor-pointer [&_:is(a,_button)]:transition-all [&_:is(a,_button)]:duration-[160ms] [&_:is(a,_button)]:ease-[ease] [&_:is(a,_button)]:delay-0 [&_:is(a,_button)]:px-3 [&_:is(a,_button)]:py-0 [&_:is(a,_button)]:rounded-[9px] [&_:is(a,_button)]:border-0 [&_:is(a,_button)]:border-none [&_:is(a,_button)]:border-current [&_:is(a,_button)]:hover:text-[color:var(--ink)] [&_:is(a,_button)]:hover:[background:#f3f5f8] [&_:is(a,_button)]:text-ui [&_:is(a,_button)]:font-semibold [&_:is(a,_button)_svg]:w-[18px] [&_:is(a,_button)_svg]:flex-none [&_:is(a,_button)_small]:min-w-[22px] [&_:is(a,_button)_small]:[background:#e8edf4] [&_:is(a,_button)_small]:text-ui-caption [&_:is(a,_button)_small]:text-center [&_:is(a,_button)_small]:ml-auto [&_:is(a,_button)_small]:px-1.5 [&_:is(a,_button)_small]:py-0.5 [&_:is(a,_button)_small]:rounded-[10px] [&_:is(a,_button)[aria-current=page]]:text-[#1e53b8] [&_:is(a,_button)[aria-current=page]]:[background:#eaf1ff] [&_:is(a,_button)[aria-current=page]]:font-bold" aria-label="Điều hướng dashboard">
          <p>Không gian làm việc</p>
          <Link aria-current={view === "review" ? "page" : undefined} href="/dashboard/user/review"><Icon name="upload" />Tải & rà soát</Link>
          <Link aria-current={view === "contract" ? "page" : undefined} href="/dashboard/user/contract"><Icon name="document" />Hợp đồng<small>{data.totalContracts}</small></Link>
          <p>Hỗ trợ</p>
          <Link href="/chon-to-chuc"><Icon name="building" />Tạo tổ chức</Link>
          <Link href="/bao-cao-mau"><Icon name="search" />Báo cáo mẫu</Link><Link href="/goi-dich-vu"><Icon name="sparkle" />Gói dịch vụ</Link>
        </nav>
        <div className="grid grid-cols-[38px_minmax(0,1fr)] items-center gap-2.5 [border-top:1px_solid_var(--line)] mt-auto pt-[17px] pb-0 px-[7px] [&>_span]:w-9 [&>_span]:h-9 [&>_span]:grid [&>_span]:place-items-center [&>_span]:text-[white] [&>_span]:[background:#1b3154] [&>_span]:text-ui [&>_span]:font-extrabold [&>_span]:rounded-[9px] [&_strong]:block [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_small]:block [&_small]:overflow-hidden [&_small]:text-ellipsis [&_small]:whitespace-nowrap [&_strong]:text-ui [&_small]:text-[color:var(--muted)] [&_small]:text-ui-meta [&_small]:mt-0.5"><span>{profileInitials}</span><div><strong>{data.user?.name ?? "Tài khoản LawScan"}</strong><small>{roleLabel}</small></div><button className="col-span-full min-h-[38px] flex items-center justify-center gap-2 text-[#627086] border border-[color:var(--line)] [background:white] [font-family:inherit] cursor-pointer mt-[7px] rounded-lg border-solid hover:text-[#a6374b] hover:[background:#fff8f8] hover:border-[#eac5cc] disabled:opacity-60 text-ui font-semibold [&_svg]:w-[15px] [&_svg]:[transform:rotate(180deg)]" type="button" onClick={logout} disabled={isLoggingOut}><Icon name="arrow" />{isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</button></div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="min-h-[68px] flex items-center justify-between gap-5 [border-bottom:1px_solid_var(--line)] [background:rgb(255_255_255_/_0.94)] px-[clamp(24px,4vw,52px)] py-[13px] [&>_p]:flex [&>_p]:items-center [&>_p]:gap-2.5 [&>_p]:text-[color:var(--muted)] [&>_p]:text-ui [&>_p_i]:text-[#bdc5d0] [&>_p_i]:not-italic [&>_p_strong]:text-[color:var(--ink)] [@media_(max-width:_820px)]:min-h-[62px] [@media_(max-width:_820px)]:[padding-inline:18px] [&>_p]:[@media_(max-width:_820px)]:hidden"><div className="hidden [@media_(max-width:_820px)]:flex [@media_(max-width:_820px)]:items-center [@media_(max-width:_820px)]:gap-2 [&_.brand-image]:[@media_(max-width:_820px)]:w-[33px] [&_.brand-image]:[@media_(max-width:_820px)]:h-[33px] [&_strong]:[@media_(max-width:_820px)]:text-ui"><Brand markOnly /><strong>LawScan</strong></div><p><span>{data.organization.name}</span><i>/</i><strong>{view === "review" ? "Tải & rà soát" : "Hợp đồng"}</strong></p><div className="flex items-center gap-[13px]"><span className="min-h-[30px] inline-flex items-center gap-[7px] text-[#345981] border [background:#f6f9fc] text-ui-caption font-semibold px-2.5 py-0 rounded-[20px] border-solid border-[#d9e4f0] [&_svg]:w-3.5 [@media_(max-width:_820px)]:hidden"><Icon name="shield" />{roleLabel}</span><span className="w-9 h-9 grid place-items-center text-[white] [background:#1b3154] text-ui font-extrabold rounded-[9px] w-[34px] h-[34px] [@media_(max-width:_820px)]:hidden">{profileInitials}</span><button className="hidden [@media_(max-width:_820px)]:w-[35px] [@media_(max-width:_820px)]:h-[35px] [@media_(max-width:_820px)]:grid [@media_(max-width:_820px)]:place-items-center [@media_(max-width:_820px)]:text-[#607087] [@media_(max-width:_820px)]:border [@media_(max-width:_820px)]:border-[color:var(--line)] [@media_(max-width:_820px)]:[background:white] [@media_(max-width:_820px)]:rounded-[9px] [@media_(max-width:_820px)]:border-solid [&_svg]:[@media_(max-width:_820px)]:w-[15px] [&_svg]:[@media_(max-width:_820px)]:[transform:rotate(180deg)]" type="button" onClick={logout} disabled={isLoggingOut} aria-label="Đăng xuất"><Icon name="arrow" /></button></div></header>
        <nav className="hidden [@media_(max-width:_820px)]:flex [@media_(max-width:_820px)]:gap-[5px] [@media_(max-width:_820px)]:overflow-x-auto [@media_(max-width:_820px)]:[border-bottom:1px_solid_var(--line)] [@media_(max-width:_820px)]:[background:white] [@media_(max-width:_820px)]:px-[18px] [@media_(max-width:_820px)]:py-2 [&_:is(a,_button)]:[@media_(max-width:_820px)]:min-h-[34px] [&_:is(a,_button)]:[@media_(max-width:_820px)]:inline-flex [&_:is(a,_button)]:[@media_(max-width:_820px)]:items-center [&_:is(a,_button)]:[@media_(max-width:_820px)]:gap-[7px] [&_:is(a,_button)]:[@media_(max-width:_820px)]:flex-none [&_:is(a,_button)]:[@media_(max-width:_820px)]:text-[#66758b] [&_:is(a,_button)]:[@media_(max-width:_820px)]:[background:transparent] [&_:is(a,_button)]:[@media_(max-width:_820px)]:[font:inherit] [&_:is(a,_button)]:[@media_(max-width:_820px)]:px-2.5 [&_:is(a,_button)]:[@media_(max-width:_820px)]:py-0 [&_:is(a,_button)]:[@media_(max-width:_820px)]:rounded-lg [&_:is(a,_button)]:[@media_(max-width:_820px)]:border-0 [&_:is(a,_button)]:[@media_(max-width:_820px)]:border-none [&_:is(a,_button)]:[@media_(max-width:_820px)]:border-current [&_:is(a,_button)]:[@media_(max-width:_820px)]:aria-[current=page]:text-[color:var(--accent)] [&_:is(a,_button)]:[@media_(max-width:_820px)]:aria-[current=page]:[background:#eaf1ff] [&_svg]:[@media_(max-width:_820px)]:w-[15px] [@media_(max-width:_820px)]:[&_:is(a,_button)]:text-ui [@media_(max-width:_820px)]:[&_:is(a,_button)]:font-semibold" aria-label="Điều hướng dashboard trên điện thoại"><Link href="/dashboard/user/review" aria-current={view === "review" ? "page" : undefined}><Icon name="upload" />Tải & rà soát</Link><Link href="/dashboard/user/contract" aria-current={view === "contract" ? "page" : undefined}><Icon name="document" />Hợp đồng</Link><Link href="/chon-to-chuc"><Icon name="building" />Tạo tổ chức</Link></nav>
        <main id="dashboard-content" className="w-[min(1420px,100%)] [margin-inline:auto] pt-[38px] pb-16 px-[clamp(24px,4vw,52px)] [@media_(max-width:_820px)]:pt-[30px] [@media_(max-width:_820px)]:pb-12 [@media_(max-width:_820px)]:px-[18px]">
          {children({ data, access, roleLabel })}
        </main>
      </div>
    </div>
  );
}
