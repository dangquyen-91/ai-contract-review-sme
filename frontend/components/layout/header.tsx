import Link from "next/link";
import { workspacePath } from "@/lib/workspace-path";
import { cookies } from "next/headers";
import { Brand } from "@/components/ui/brand";
import { decodeSessionUser, userSessionCookie } from "@/lib/auth-session";
import { AccountMenu } from "./account-menu";
import { MobileMenu } from "./mobile-menu";

export async function Header() {
  const cookieStore = await cookies();
  const hasSession = cookieStore.has("lawscan_access") || cookieStore.has("lawscan_refresh");
  const user = hasSession ? decodeSessionUser(cookieStore.get(userSessionCookie)?.value) : null;
  const accountHref = workspacePath(user);

  return (
    <header className="print:hidden min-h-[104px] relative z-10 [&_nav]:text-[length:17px] [&>_div]:text-[length:17px] [@media_(max-width:_600px)]:min-h-20 w-[min(1380px,calc(100%_-_112px))] [margin-inline:auto] [@media_(max-width:_1199px)]:w-[calc(100%_-_64px)] [@media_(max-width:_600px)]:w-[calc(100%_-_40px)] flex items-center justify-between gap-6">
      <Link href="/" aria-label="LawScan — về trang chủ"><Brand /></Link>
      <nav aria-label="Điều hướng chính" className="hidden items-center gap-10 lg:flex">
        <Link href="/#tinh-nang">Tính năng</Link><Link href="/#quy-trinh">Cách hoạt động</Link><Link href="/goi-dich-vu">Bảng giá</Link>
      </nav>
      <div className="gap-6 hidden items-center lg:flex">
        {user ? (
          <AccountMenu user={user} accountHref={accountHref} />
        ) : (
          <><Link href="/dang-nhap">Đăng nhập</Link><Link className="inline-flex justify-center items-center gap-[15px] min-h-[52px] [background:var(--ls-blue)] text-[white] border border-[color:var(--ls-blue)] font-[550] text-center [text-decoration:none] [transition:background-color_0.2s,color_0.2s,border-color_0.2s,box-shadow_0.25s,transform_0.25s] px-[25px] py-3 rounded-[9px] border-solid hover:text-[white] hover:[background:#0054d4] hover:[transform:translateY(-1px)] hover:border-[#0054d4] min-w-[124px] rounded-[13px] min-h-16 text-[length:19px] py-4 rounded-xl [@media_(hover:_hover)_and_(pointer:_fine)]:hover:[transform:translateY(-3px)] [@media_(hover:_hover)_and_(pointer:_fine)]:hover:shadow-[0_10px_24px_-10px_#0066ff80] [@media_(max-width:_1199px)]:text-[length:16px] [@media_(max-width:_1199px)]:[padding-inline:18px] [@media_(max-width:_1199px)]:min-h-[54px] [@media_(max-width:_600px)]:text-[length:16px] [@media_(max-width:_600px)]:text-[length:14px] [@media_(max-width:_600px)]:mt-2 motion-reduce:hover:transform-none" href="/dang-ky">Đăng ký</Link></>
        )}
      </div>
      <MobileMenu user={user} />
    </header>
  );
}
