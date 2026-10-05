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
    <div className="account-menu" ref={container}>
      <button
        ref={trigger}
        className="user-avatar account-menu-trigger"
        type="button"
        aria-label={`Mở menu tài khoản của ${user.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {getUserInitials(user.name)}
      </button>

      {open && (
        <div className="account-dropdown" role="menu" aria-label="Menu tài khoản">
          <div className="account-dropdown-profile">
            <span className="account-dropdown-avatar">{getUserInitials(user.name)}</span>
            <span>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </span>
          </div>
          <div className="account-dropdown-actions">
            <Link href={accountHref} role="menuitem" onClick={() => setOpen(false)}>
              <Icon name="user" />
              Tài khoản của tôi
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
