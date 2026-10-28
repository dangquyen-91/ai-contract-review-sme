"use client";

import { useEffect, useEffectEvent } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useRefreshTokenMutation } from "@/hooks/auth/use-auth";
import { isApiClientError } from "@/lib/api/client";
import { clearSessionCache } from "@/lib/session-cache";

const refreshIntervalMs = 10 * 60 * 1000;

export function useSessionKeeper() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const refresh = useRefreshTokenMutation();
  const refreshSession = useEffectEvent(() => refresh.mutateAsync());

  useEffect(() => {
    let active = true;
    let lastRefresh = 0;
    let pending = false;
    async function refreshIfNeeded() {
      if (!active || pending || document.visibilityState !== "visible") return;
      if (Date.now() - lastRefresh < refreshIntervalMs) return;
      pending = true;
      try {
        await refreshSession();
        if (active) lastRefresh = Date.now();
      } catch (error) {
        if (active && isApiClientError(error) && error.status === 401) {
          await clearSessionCache(queryClient);
          if (active) { router.replace("/dang-nhap"); router.refresh(); }
        }
      } finally { pending = false; }
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
  }, [router, queryClient]);
}
