import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { workspacePath } from "@/lib/workspace-path";
import { cookies } from "next/headers";
import { Brand } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";
import { decodeSessionUser, userSessionCookie } from "@/lib/auth-session";
import { AccountMenu } from "./account-menu";
import { MobileMenu } from "./mobile-menu";

export async function Header() {
  const cookieStore = await cookies();
  const hasSession = cookieStore.has("lawscan_access") || cookieStore.has("lawscan_refresh");
  const user = hasSession ? decodeSessionUser(cookieStore.get(userSessionCookie)?.value) : null;
  const accountHref = workspacePath(user);

  return <header className="relative z-20 mx-auto flex min-h-[104px] w-[calc(100%_-_40px)] max-w-[1380px] items-center justify-between gap-5 text-sm text-[#14213d] print:hidden max-sm:min-h-20 sm:w-[calc(100%_-_64px)] lg:w-[calc(100%_-_112px)]">
    <Link href="/" aria-label="LawScan — về trang chủ" className="shrink-0"><Brand /></Link>
    <nav aria-label="Điều hướng chính" className="hidden items-center gap-6 font-medium lg:flex xl:gap-8 [&_a]:rounded [&_a]:py-2 [&_a]:transition-colors [&_a]:hover:text-[#2864dc] [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-4 [&_a]:focus-visible:outline-[#2864dc]">
      <Link href="/#tinh-nang">Tính năng</Link><Link href="/#quy-trinh">Quy trình</Link><Link href="/goi-dich-vu">Gói dịch vụ</Link><Link href="/#cau-hoi">FAQ</Link>
    </nav>
    <div className="hidden shrink-0 items-center gap-5 lg:flex">
      {user ? <AccountMenu user={user} accountHref={accountHref} /> : <>
        <Link href="/dang-nhap" className="inline-flex items-center gap-1 font-medium">Đăng nhập<ArrowRight className="size-3.5" aria-hidden="true" /></Link>
        <Button asChild size="sm" className="h-11 rounded-full border border-[#c9d8ed] bg-white px-5 text-[#2864dc] shadow-[0_3px_10px_-7px_#14213d30] hover:border-[#a9c3e8] hover:bg-[#f6f9ff] hover:text-[#1f4fb2]"><Link href="/dang-ky">Bắt đầu miễn phí<ArrowUpRight aria-hidden="true" /></Link></Button>
      </>}
    </div>
    <MobileMenu user={user} />
  </header>;
}
