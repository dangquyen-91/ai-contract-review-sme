import Link from "next/link";
import { Brand } from "@/components/ui/brand";
import { MobileMenu } from "./mobile-menu";

export function Header() {
  return (
    <header className="site-header ls-container flex items-center justify-between gap-6">
      <Link href="/" aria-label="LawScan — về trang chủ"><Brand /></Link>
      <nav aria-label="Điều hướng chính" className="hidden items-center gap-10 lg:flex">
        <Link href="/#tinh-nang">Tính năng</Link><Link href="/#quy-trinh">Cách hoạt động</Link><Link href="/goi-dich-vu">Bảng giá</Link>
      </nav>
      <div className="header-actions hidden items-center lg:flex"><Link href="/dang-nhap">Đăng nhập</Link><Link className="ls-button" href="/dang-ky">Đăng ký</Link></div>
      <MobileMenu />
    </header>
  );
}
