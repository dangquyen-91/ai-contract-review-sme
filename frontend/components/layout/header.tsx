import Link from "next/link";
import { cookies } from "next/headers";
import { Brand } from "@/components/ui/brand";
import { decodeSessionUser, userSessionCookie } from "@/lib/auth-session";
import { AccountMenu } from "./account-menu";
import { MobileMenu } from "./mobile-menu";

export async function Header() {
  const cookieStore = await cookies();
  const hasSession = cookieStore.has("lawscan_access") || cookieStore.has("lawscan_refresh");
  const user = hasSession ? decodeSessionUser(cookieStore.get(userSessionCookie)?.value) : null;
  const accountHref = !user?.hasCompletedOnboarding ? "/chon-to-chuc" : ["owner", "administrator", "manager"].includes(user.role) ? "/dashboard/owner" : "/dashboard/user";

  return (
    <header className="site-header ls-container flex items-center justify-between gap-6">
      <Link href="/" aria-label="LawScan — về trang chủ"><Brand /></Link>
      <nav aria-label="Điều hướng chính" className="hidden items-center gap-10 lg:flex">
        <Link href="/#tinh-nang">Tính năng</Link><Link href="/#quy-trinh">Cách hoạt động</Link><Link href="/goi-dich-vu">Bảng giá</Link>
      </nav>
      <div className="header-actions hidden items-center lg:flex">
        {user ? (
          <AccountMenu user={user} accountHref={accountHref} />
        ) : (
          <><Link href="/dang-nhap">Đăng nhập</Link><Link className="ls-button" href="/dang-ky">Đăng ký</Link></>
        )}
      </div>
      <MobileMenu user={user} />
    </header>
  );
}
