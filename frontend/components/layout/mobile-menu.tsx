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
      <button ref={trigger} type="button" className="grid place-items-center w-11 h-11 border border-[color:var(--ls-line)] rounded-lg border-solid" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Đóng menu" : "Mở menu"} onClick={() => setOpen(!open)}>
        <span className={`grid gap-1.5 [&_i]:h-0.5 [&_i]:w-5 [&_i]:bg-[var(--ls-ink)] [&_i]:transition-transform [&_i]:duration-200 ${open ? "[&_i:first-child]:translate-y-1 [&_i:first-child]:rotate-45 [&_i:last-child]:-translate-y-1 [&_i:last-child]:-rotate-45" : ""}`}><i /><i /></span>
      </button>
      <nav id="mobile-navigation" aria-label="Điều hướng di động" className="absolute top-[calc(100%_-_4px)] [background:#fff] border border-[color:var(--ls-line)] shadow-[0_15px_25px_#18244312] p-3 rounded-xl border-solid inset-x-0 [&_a]:block [&_a]:p-3" hidden={!open}>
        {navigationItems.map(([href, label]) => (
          <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>
        ))}
        {user ? (
          <Link className="flex items-center gap-3 [border-top:1px_solid_var(--ls-line)] mt-1.5 [&_strong]:block [&_small]:block [&_strong]:text-[length:14px] [&_small]:max-w-[220px] [&_small]:overflow-hidden [&_small]:text-[color:var(--ls-muted)] [&_small]:text-[length:11px] [&_small]:font-normal [&_small]:text-ellipsis [&_small]:whitespace-nowrap" href={accountHref} onClick={() => setOpen(false)}>
            <span className="w-11 h-11 inline-grid place-items-center flex-none text-[white] [background:linear-gradient(135deg,#0875ff,#0049b8)] shadow-[0_0_0_1px_#b9d3f7,0_6px_18px_#075fc333] text-[length:14px] font-[720] tracking-[0.4px] [text-decoration:none] rounded-[50%] border-2 border-solid border-[white] hover:text-[white] hover:[background:linear-gradient(135deg,#005fe0,#003b96)] hover:shadow-[0_0_0_2px_#8bbcff,0_8px_20px_#075fc344] w-[38px] h-[38px] text-[length:12px]">{getUserInitials(user.name)}</span>
            <span><strong>{user.name}</strong><small>{user.email}</small></span>
          </Link>
        ) : (
          <>
            <Link href="/dang-nhap" onClick={() => setOpen(false)}>Đăng nhập</Link>
            <Link className="text-[white] [background:#0066ff] text-center mt-1.5 rounded-lg hover:text-[white] hover:[background:#0058dc]" href="/dang-ky" onClick={() => setOpen(false)}>Đăng ký</Link>
          </>
        )}
      </nav>
    </div>
  );
}
