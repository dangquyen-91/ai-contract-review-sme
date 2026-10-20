"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardShell } from "./dashboard-shell";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { AuthUser } from "@/types/auth";

export function PersonalAccountDashboard({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const view = pathname.endsWith("/contract") ? "contract" : pathname.endsWith("/subscription") ? "subscription" : "review";
  const title = view === "contract" ? "Hợp đồng của bạn" : view === "subscription" ? "Gói dịch vụ của bạn" : "Tải & rà soát hợp đồng";
  return <DashboardShell role="user" activeKey={view} sectionLabel={title} workspaceName="Tài khoản cá nhân" workspaceLabel="Không gian làm việc" name={user.name} roleLabel="Người dùng" contractCount={0}>
    <header className="mb-8"><p className="text-sm text-muted-foreground">Xin chào, {user.name}</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1></header>
    <section className="rounded-2xl border bg-white p-6 sm:p-8">
      <Icon name={view === "contract" ? "briefcase" : view === "subscription" ? "sparkle" : "upload"} className="mb-4 h-8 w-8 text-blue-600" />
      <h2 className="text-xl font-semibold">{view === "contract" ? "Bạn chưa có hợp đồng" : view === "subscription" ? "Bạn chưa có gói dịch vụ" : "Chào mừng bạn đến với LawScan"}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Tài khoản của bạn đã sẵn sàng. Lời mời từ tổ chức sẽ xuất hiện tại đây để bạn kiểm tra và xác nhận tham gia.</p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Hiện tính năng tải, rà soát hợp đồng và hạn mức được cung cấp trong không gian tổ chức. Bạn có thể xem báo cáo mẫu để tìm hiểu cách LawScan hoạt động.</p>
      <div className="mt-6 flex flex-wrap gap-3"><Button asChild><Link href="/bao-cao-mau">Xem báo cáo mẫu</Link></Button><Button asChild variant="outline"><Link href="/chon-to-chuc">Tạo tổ chức</Link></Button></div>
    </section>
  </DashboardShell>;
}
