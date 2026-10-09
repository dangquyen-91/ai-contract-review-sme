"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { isApiClientError } from "@/lib/api/client";

const refreshIntervalMs = 10 * 60 * 1000;

export function SessionKeeper() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    let lastRefresh = 0;
    let pending = false;

    async function refreshIfNeeded() {
      if (!active || pending || document.visibilityState !== "visible") return;
      if (Date.now() - lastRefresh < refreshIntervalMs) return;

      pending = true;
      try {
        await authApi.refreshToken();
        lastRefresh = Date.now();
      } catch (error) {
        if (active && isApiClientError(error) && error.status === 401) {
          router.replace("/dang-nhap");
          router.refresh();
        }
      } finally {
        pending = false;
      }
    }

    void refreshIfNeeded();
    const timer = window.setInterval(() => void refreshIfNeeded(), refreshIntervalMs);
    const onFocus = () => void refreshIfNeeded();
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [router]);

  return null;
}
