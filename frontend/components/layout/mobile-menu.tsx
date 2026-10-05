"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { getUserInitials } from "@/lib/user-display";
import type { AuthUser } from "@/types/auth";

const navigationItems = [
  ["/#tinh-nang", "Tính năng"],
  ["/#quy-trinh", "Cách hoạt động"],
  ["/#phan-tich", "Phân tích mẫu"],
  ["/bao-cao-mau", "Báo cáo mẫu"],
  ["/goi-dich-vu", "Bảng giá"],
] as const;

export function MobileMenu({ user }: { user: AuthUser | null }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const accountHref = !user?.hasCompletedOnboarding ? "/chon-to-chuc" : ["owner", "administrator", "manager"].includes(user.role) ? "/dashboard/owner" : "/dashboard/user";

  return (
    <div className="lg:hidden" onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } }}>
      <button ref={trigger} type="button" className="menu-toggle" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Đóng menu" : "Mở menu"} onClick={() => setOpen(!open)}>
        <span className={open ? "menu-lines is-open" : "menu-lines"}><i /><i /></span>
      </button>
      <nav id="mobile-navigation" aria-label="Điều hướng di động" className="mobile-navigation" hidden={!open}>
        {navigationItems.map(([href, label]) => (
          <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>
        ))}
        {user ? (
          <Link className="mobile-account" href={accountHref} onClick={() => setOpen(false)}>
            <span className="user-avatar">{getUserInitials(user.name)}</span>
            <span><strong>{user.name}</strong><small>{user.email}</small></span>
          </Link>
        ) : (
          <>
            <Link href="/dang-nhap" onClick={() => setOpen(false)}>Đăng nhập</Link>
            <Link className="mobile-register" href="/dang-ky" onClick={() => setOpen(false)}>Đăng ký</Link>
          </>
        )}
      </nav>
    </div>
  );
}
