"use client";

import Link from "next/link";
import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";
import type { NavigationItem } from "../../config/navigation-config";

type NavigationProps = {
  items: NavigationItem[];
  activeKey: string;
  onNavigate?: (key: string) => void;
  contractCount?: number;
  mobile?: boolean;
};

export function DashboardNavigation({ items, activeKey, onNavigate, contractCount, mobile = false }: NavigationProps) {
  return (
    <nav aria-label={mobile ? "Điều hướng dashboard trên điện thoại" : "Điều hướng dashboard"} className={mobile ? "flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-[18px] py-2 min-[821px]:hidden" : "mt-6 grid content-start gap-1"}>
      {items.filter((item) => !mobile || item.mobile).map((item) => {
        const active = item.key === activeKey;
        const className = mobile
          ? `inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`
          : `relative flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-xs font-medium transition-colors ${active ? "bg-blue-50 font-bold text-blue-700 before:absolute before:left-0 before:h-6 before:w-[3px] before:rounded-r before:bg-blue-600" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`;
        const content = <><Icon name={item.icon} className={mobile ? "size-4 shrink-0" : "size-[18px] shrink-0"} /><span>{item.label}</span>{item.count && !mobile && <small className="ml-auto rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px]">{contractCount ?? 0}</small>}{item.pending && !mobile && <span className="ml-auto size-1.5 rounded-full bg-slate-300" title="Chờ API" aria-label="Chờ API" />}</>;
        return (
          <div key={item.key} className={mobile ? "shrink-0" : undefined}>
            {!mobile && item.group && <p className="mb-2 mt-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 first:mt-0">{item.group}</p>}
            {item.href ? <Link href={item.href} aria-current={active ? "page" : undefined} className={className}>{content}</Link> : <button type="button" onClick={() => onNavigate?.(item.key)} aria-current={active ? "page" : undefined} className={className}>{content}</button>}
          </div>
        );
      })}
    </nav>
  );
}

type SidebarProps = NavigationProps & {
  homeHref: string;
  workspaceName?: string;
  workspaceLabel: string;
  name: string;
  roleLabel: string;
  onLogout: () => void;
  loggingOut: boolean;
};

export function DashboardSidebar({ homeHref, workspaceName, workspaceLabel, name, roleLabel, onLogout, loggingOut, ...navigation }: SidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[252px] shrink-0 flex-col border-r border-slate-200 bg-white px-4 pb-[18px] pt-[22px] min-[821px]:flex max-[1100px]:w-[218px]">
      <Link href={homeHref} aria-label="LawScan dashboard" className="w-fit pl-2 [&_.brand-image]:h-[52px] [&_.brand-image]:w-[150px] [&_.brand-image_img]:top-[-18px] [&_.brand-image_img]:h-[84px] [&_.brand-image_img]:w-[154px]"><Brand /></Link>
      {workspaceName && <div className="mt-[22px] grid grid-cols-[38px_minmax(0,1fr)] items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-[11px]"><span className="grid size-[38px] place-items-center rounded-lg bg-blue-50 text-blue-700"><Icon name={workspaceLabel === "Không gian cá nhân" ? "user" : "building"} className="size-[18px]" /></span><div className="min-w-0"><strong className="block truncate text-xs">{workspaceName}</strong><small className="block truncate text-[10px] text-slate-500">{workspaceLabel}</small></div></div>}
      <DashboardNavigation {...navigation} />
      <div className="mt-auto border-t border-slate-200 pt-4"><div className="flex items-center gap-2 px-2"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100"><Icon name="user" className="size-4" /></span><div className="min-w-0"><strong className="block truncate text-xs">{name}</strong><small className="block truncate text-[10px] text-slate-500">{roleLabel}</small></div></div><button type="button" onClick={onLogout} disabled={loggingOut} className="mt-3 flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"><Icon name="arrow" className="size-4 rotate-180" />{loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</button></div>
    </aside>
  );
}
