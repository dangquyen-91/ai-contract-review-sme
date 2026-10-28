"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useLogoutWorkflow } from "@/hooks/auth/use-logout-workflow";
import { getUserInitials } from "@/lib/user-display";
import type { AuthUser } from "@/types/auth";

export function AccountMenu({ user, accountHref }: { user: AuthUser; accountHref: string }) {
  const [open, setOpen] = useState(false);
  const { logout, loggingOut: isLoggingOut } = useLogoutWorkflow({ onSuccess: () => setOpen(false), successMessage: "Đăng xuất thành công" });
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={container}>
      <button
        ref={trigger}
        className="inline-grid size-[38px] shrink-0 place-items-center rounded-full border-2 border-white bg-[linear-gradient(135deg,#0875ff,#0049b8)] p-0 font-[family-name:inherit] text-[12px] font-bold tracking-[0.4px] text-white shadow-[0_0_0_1px_#b9d3f7,0_6px_18px_#075fc333] hover:bg-[linear-gradient(135deg,#005fe0,#003b96)] hover:shadow-[0_0_0_2px_#8bbcff,0_8px_20px_#075fc344] aria-expanded:shadow-[0_0_0_3px_#bed7ff,0_8px_20px_#075fc344]"
        type="button"
        aria-label={`Mở menu tài khoản của ${user.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {getUserInitials(user.name)}
      </button>

      {open && (
        <div className="absolute z-30 w-[286px] text-[color:var(--ls-ink)] [background:#fff] border shadow-[0_18px_50px_-18px_#17284959,0_6px_16px_#17284914] origin-top-right animate-[account-dropdown-in_0.16s_ease-out] rounded-[14px] border-solid border-[#dce4ef] right-0 top-[calc(100%_+_14px)] before:content-[''] before:absolute before:top-[-5px] before:w-2.5 before:h-2.5 before:[background:#fff] before:[border-top:1px_solid_#dce4ef] before:[border-left:1px_solid_#dce4ef] before:[transform:rotate(45deg)] before:right-[19px]" role="menu" aria-label="Menu tài khoản">
          <div className="flex min-w-0 items-center gap-3 border-b border-[#e7edf5] px-[18px] py-[17px]">
            <span className="grid size-[38px] shrink-0 place-items-center rounded-full bg-[#e9f2ff] text-[12px] font-bold tracking-[0.3px] text-[#075bcf]">{getUserInitials(user.name)}</span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-[14px] leading-[1.4]">{user.name}</strong>
              <small className="mt-0.5 block truncate text-[12px] text-[color:var(--ls-muted)]">{user.email}</small>
            </span>
          </div>
          <div className="grid gap-1 p-[7px]">
            <Link href={accountHref} role="menuitem" onClick={() => setOpen(false)} className="flex min-h-[42px] w-full items-center gap-[11px] rounded-lg px-[11px] py-2 text-left text-[13px] font-medium text-[#34415f] no-underline hover:bg-[#f0f6ff] hover:text-[#075bcf] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#075bcf]">
              <Icon name="user" className="size-[18px] shrink-0" />
              Không gian làm việc
            </Link>
            <button type="button" role="menuitem" onClick={logout} disabled={isLoggingOut} className="flex min-h-[42px] w-full items-center gap-[11px] rounded-lg border-0 bg-transparent px-[11px] py-2 text-left font-[family-name:inherit] text-[13px] font-medium text-[#a42f43] hover:bg-[#fff3f5] hover:text-[#92263a] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#a42f43] disabled:cursor-wait disabled:opacity-60">
              <Icon name="arrow" className="size-[18px] shrink-0 rotate-180" />
              {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
