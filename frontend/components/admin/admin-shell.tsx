"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";
import { authApi } from "@/lib/api/auth";

const navigation = [
  {
    href: "/dashboard/admin",
    label: "Tổng quan",
    icon: "briefcase",
    group: "Không gian quản trị",
  },
  {
    href: "/dashboard/admin/organizations",
    label: "Tổ chức",
    icon: "building",
    pending: true,
  },
  {
    href: "/dashboard/admin/users",
    label: "Người dùng",
    icon: "team",
    pending: true,
  },
  {
    href: "/dashboard/admin/ai-jobs",
    label: "Giám sát AI",
    icon: "sparkle",
    group: "Vận hành",
    pending: true,
  },
  {
    href: "/dashboard/admin/legal-sources",
    label: "Kho pháp lý",
    icon: "scales",
  },
  {
    href: "/dashboard/admin/reports",
    label: "Báo cáo & thống kê",
    icon: "chart",
    pending: true,
  },
  {
    href: "/dashboard/admin/audit-log",
    label: "Nhật ký quản trị",
    icon: "shield",
    pending: true,
  },
] as const;

export function AdminShell({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const current = navigation.find((item) => item.href === pathname);

  async function logout() {
    setLoggingOut(true);
    try {
      await authApi.logout();
      queryClient.clear();
      router.replace("/dang-nhap");
      router.refresh();
    } catch {
      toast.error("Không thể đăng xuất. Vui lòng thử lại.");
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#f6f7f9] font-sans text-[#202b3d] selection:bg-blue-100 [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-4 [&_a]:focus-visible:outline-blue-600 [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-4 [&_button]:focus-visible:outline-blue-600">
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-4"
      >
        Đến nội dung chính
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-[252px] flex-col border-r border-slate-200 bg-white px-4 py-7 lg:flex">
        <Link
          href="/dashboard/admin"
          aria-label="LawScan Admin — tổng quan quản trị"
          className="flex w-fit items-center gap-2 pl-2 [&_.brand-image]:h-[52px] [&_.brand-image]:w-[150px] [&_.brand-image_img]:top-[-18px] [&_.brand-image_img]:h-[84px] [&_.brand-image_img]:w-[154px]"
        >
          <Brand />
          <span className="border-l border-slate-200 pl-2 text-xs font-semibold text-slate-500">
            Admin
          </span>
        </Link>
        <nav aria-label="Điều hướng quản trị" className="mt-6 space-y-1">
          {navigation.map((item) => (
            <div key={item.href}>
              {"group" in item && (
                <p
                  className={`px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 ${item.href === "/dashboard/admin" ? "pt-0" : "pt-5"}`}
                >
                  {item.group}
                </p>
              )}
              <Link
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={`relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-200 active:scale-[0.98] ${pathname === item.href ? "bg-blue-50 text-blue-700 before:absolute before:left-0 before:h-6 before:w-[3px] before:rounded-r before:bg-blue-600" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-md ${pathname === item.href ? "bg-white text-blue-700" : "text-slate-500"}`}
                >
                  <Icon name={item.icon} className="size-[17px]" />
                </span>
                {item.label}
                {"pending" in item && item.pending && (
                  <span
                    className="ml-auto size-1.5 rounded-full bg-slate-300"
                    title="Chờ API"
                    aria-label="Chờ API"
                  />
                )}
              </Link>
            </div>
          ))}
        </nav>
        <div className="mt-auto border-t border-slate-200 pt-5">
          <div className="flex items-center gap-3 px-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100">
              <Icon name="user" className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="mt-0.5 text-xs text-slate-500">Quản trị hệ thống</p>
            </div>
          </div>
          <button
            type="button"
            disabled={loggingOut}
            onClick={logout}
            className="mt-4 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <Icon name="arrow" className="size-4 rotate-180" />
            {loggingOut ? "Đang đăng xuất…" : "Đăng xuất"}
          </button>
        </div>
      </aside>
      <div className="lg:pl-[252px]">
        <header className="border-b border-slate-200 bg-white px-[18px] sm:px-8 lg:px-10">
          <div className="mx-auto flex min-h-[68px] max-w-[1340px] items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/dashboard/admin"
                aria-label="LawScan Admin"
                className="flex shrink-0 items-center gap-2 lg:hidden [&_.brand-image]:size-9"
              >
                <Brand markOnly />
                <span className="text-[15px] font-semibold tracking-tight">
                  LawScan
                </span>
              </Link>
              <p className="hidden text-sm lg:block">
                <span className="text-slate-500">Quản trị hệ thống</span>
                <span className="mx-3 text-slate-300">/</span>
                <strong className="font-semibold">
                  {current?.label ?? "Dashboard"}
                </strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 sm:flex">
                <Icon name="shield" className="size-3.5" />
                Administrator
              </span>
              <button
                type="button"
                aria-expanded={open}
                aria-controls="admin-mobile-menu"
                aria-label={open ? "Đóng menu quản trị" : "Mở menu quản trị"}
                onClick={() => setOpen(!open)}
                className="grid size-11 place-items-center rounded-lg border border-slate-200 text-sm font-medium lg:hidden"
              >
                {open ? "Đóng" : "Menu"}
              </button>
            </div>
          </div>
          <nav
            id="admin-mobile-menu"
            hidden={!open}
            aria-label="Điều hướng quản trị trên điện thoại"
            className="border-t border-slate-100 py-3 lg:hidden"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={pathname === item.href ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm ${pathname === item.href ? "bg-blue-50 text-blue-700" : "text-slate-600"}`}
              >
                <Icon name={item.icon} className="size-4" />
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="min-h-11 px-3 text-sm text-slate-600 disabled:opacity-50"
            >
              {loggingOut ? "Đang đăng xuất…" : "Đăng xuất"}
            </button>
          </nav>
        </header>
        <main
          id="admin-content"
          className="mx-auto max-w-[1420px] px-[18px] py-8 sm:px-8 lg:px-[clamp(24px,4vw,52px)] lg:py-10"
        >
          {children}
        </main>
        <footer className="mx-auto flex max-w-[1420px] flex-wrap justify-between gap-2 px-[18px] pb-7 text-xs text-slate-500 sm:px-8 lg:px-[clamp(24px,4vw,52px)]">
          <span>LawScan · Không gian quản trị hệ thống</span>
          <Link href="/" className="hover:text-blue-700">
            Về trang chủ ↗
          </Link>
        </footer>
      </div>
    </div>
  );
}
