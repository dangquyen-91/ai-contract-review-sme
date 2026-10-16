"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layouts/dashboard/dashboard-shell";
import { getDashboardNavigation } from "@/config/dashboard-navigation";

const navigation = getDashboardNavigation("administrator");

export function SystemDashboardShell({ name, children }: { name: string; children: ReactNode }) {
  const pathname = usePathname();
  const current = navigation.find((item) => item.href === pathname);
  const activeKey = current?.key ?? "overview";

  return <DashboardShell
    role="administrator"
    activeKey={activeKey}
    sectionLabel={current?.label ?? "Dashboard"}
    workspaceName="LawScan Admin"
    workspaceLabel="Không gian quản trị"
    name={name}
    roleLabel="Quản trị hệ thống"
    mainId="admin-content"
    footer={<footer className="mx-auto flex max-w-[1420px] flex-wrap justify-between gap-2 px-[18px] pb-7 text-xs text-slate-500 sm:px-8 lg:px-[clamp(24px,4vw,52px)]"><span>LawScan · Không gian quản trị hệ thống</span><Link href="/" className="hover:text-blue-700">Về trang chủ ↗</Link></footer>}
  >{children}</DashboardShell>;
}
