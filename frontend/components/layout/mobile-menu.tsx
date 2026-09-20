"use client";

import { useRef, useState } from "react";
import Link from "next/link";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <div className="lg:hidden" onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } }}>
      <button ref={trigger} type="button" className="menu-toggle" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Đóng menu" : "Mở menu"} onClick={() => setOpen(!open)}>
        <span className={open ? "menu-lines is-open" : "menu-lines"}><i /><i /></span>
      </button>
      <nav id="mobile-navigation" aria-label="Điều hướng di động" className="mobile-navigation" hidden={!open}>
        {[["/#tinh-nang", "Tính năng"], ["/#quy-trinh", "Cách hoạt động"], ["/#phan-tich", "Phân tích mẫu"], ["/bao-cao-mau", "Báo cáo mẫu"], ["/goi-dich-vu", "Bảng giá"], ["/dang-nhap", "Đăng nhập"], ["/dang-ky", "Đăng ký"]].map(([href, label]) => <Link key={href} className={label === "Đăng ký" ? "mobile-register" : ""} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
      </nav>
    </div>
  );
}
