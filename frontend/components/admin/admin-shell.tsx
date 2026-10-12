"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { DashboardNavigation, DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { getDashboardNavigation } from "@/config/navigation-config";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";
import { useLogoutMutation } from "@/hooks/use-auth";

const navigation = getDashboardNavigation("administrator");

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
  const logoutMutation = useLogoutMutation();
  const [loggingOut, setLoggingOut] = useState(false);
  const current = navigation.find((item) => item.href === pathname);
  const activeKey = current?.key ?? "overview";

  async function logout() {
    setLoggingOut(true);
    try {
      await logoutMutation.mutateAsync();
      queryClient.clear();
      router.replace("/dang-nhap");
      router.refresh();
    } catch {
      toast.error("Không thể đăng xuất. Vui lòng thử lại.");
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex min-h-dvh bg-[#f6f7f9] font-sans text-[#202b3d] selection:bg-blue-100 [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-4 [&_a]:focus-visible:outline-blue-600 [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-4 [&_button]:focus-visible:outline-blue-600">
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-4"
      >
        Đến nội dung chính
      </a>
      <DashboardSidebar homeHref="/dashboard/admin" workspaceName="LawScan Admin" workspaceLabel="Không gian quản trị" name={name} roleLabel="Quản trị hệ thống" onLogout={logout} loggingOut={loggingOut} items={navigation} activeKey={activeKey} />
      <div className="min-w-0 flex-1">
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
              <button type="button" onClick={logout} disabled={loggingOut} aria-label="Đăng xuất" className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-50 min-[821px]:hidden">
                <Icon name="arrow" className="size-4 rotate-180" />
              </button>

            </div>
          </div>

        </header>
        <DashboardNavigation mobile items={navigation} activeKey={activeKey} />
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
