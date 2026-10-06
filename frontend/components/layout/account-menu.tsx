"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";
import { authApi } from "@/lib/api/auth";
import { getUserInitials } from "@/lib/user-display";
import type { AuthUser } from "@/types/auth";

export function AccountMenu({ user, accountHref }: { user: AuthUser; accountHref: string }) {
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

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

  async function logout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await authApi.logout();
      queryClient.clear();
      setOpen(false);
      toast.success("Đăng xuất thành công");
      router.replace("/dang-nhap");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
      toast.error("Không thể đăng xuất. Vui lòng thử lại.");
    }
  }

  return (
    <div className="relative" ref={container}>
      <button
        ref={trigger}
        className="w-11 h-11 inline-grid place-items-center flex-none text-[white] [background:linear-gradient(135deg,#0875ff,#0049b8)] shadow-[0_0_0_1px_#b9d3f7,0_6px_18px_#075fc333] text-[length:14px] font-[720] tracking-[0.4px] [text-decoration:none] rounded-[50%] border-2 border-solid border-[white] hover:text-[white] hover:[background:linear-gradient(135deg,#005fe0,#003b96)] hover:shadow-[0_0_0_2px_#8bbcff,0_8px_20px_#075fc344] w-[38px] h-[38px] text-[length:12px] [font-family:inherit] p-0 border-2 border-solid border-[white] aria-expanded:shadow-[0_0_0_3px_#bed7ff,0_8px_20px_#075fc344]"
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
          <div className="flex items-center gap-3 min-w-0 [border-bottom:1px_solid_#e7edf5] px-[18px] py-[17px] [&>_span]:last:min-w-0 [&_strong]:block [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_small]:block [&_small]:overflow-hidden [&_small]:text-ellipsis [&_small]:whitespace-nowrap [&_strong]:text-[length:14px] [&_strong]:leading-[1.4] [&_small]:text-[color:var(--ls-muted)] [&_small]:text-[length:12px] [&_small]:mt-0.5">
            <span className="grid place-items-center w-[38px] h-[38px] flex-none text-[#075bcf] [background:#e9f2ff] text-[length:12px] font-[740] tracking-[0.3px] rounded-[50%]">{getUserInitials(user.name)}</span>
            <span>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </span>
          </div>
          <div className="p-[7px] [&:is(a,_button)]:flex [&:is(a,_button)]:items-center [&:is(a,_button)]:gap-[11px] [&:is(a,_button)]:w-full [&:is(a,_button)]:min-h-[42px] [&:is(a,_button)]:text-[#34415f] [&:is(a,_button)]:[background:transparent] [&:is(a,_button)]:[font:inherit] [&:is(a,_button)]:text-left [&:is(a,_button)]:px-[11px] [&:is(a,_button)]:py-[9px] [&:is(a,_button)]:rounded-lg [&:is(a,_button)]:border-0 [&:is(a,_button)]:border-none [&:is(a,_button)]:border-current [&:is(a,_button)]:hover:text-[#075bcf] [&:is(a,_button)]:hover:[background:#f0f6ff] [&:is(a,_button)]:[font-size:13px] [&:is(a,_button)]:[font-weight:560] [&_svg]:w-[18px] [&_svg]:h-[18px] [&_svg]:flex-none [&_button]:text-[#a42f43] [&_button]:hover:text-[#92263a] [&_button]:hover:[background:#fff3f5] [&_button]:disabled:opacity-60 [&_button]:disabled:cursor-wait [&_button_svg]:[transform:rotate(180deg)]">
            <Link href={accountHref} role="menuitem" onClick={() => setOpen(false)}>
              <Icon name="user" />
              Không gian làm việc
            </Link>
            <button type="button" role="menuitem" onClick={logout} disabled={isLoggingOut}>
              <Icon name="arrow" />
              {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
