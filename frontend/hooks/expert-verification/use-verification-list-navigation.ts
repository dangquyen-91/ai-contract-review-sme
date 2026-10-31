"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useVerificationNavigationIdentity } from "@/providers/verification-navigation-provider";
import { consumeVerificationReturn, readVerificationReturn, saveVerificationReturn } from "@/lib/review/verification-navigation";

export function useVerificationListNavigation() {
  const expertId = useVerificationNavigationIdentity();
  const router = useRouter();
  return {
    remember: (target: string, row?: HTMLElement | null) => saveVerificationReturn(expertId, target, row),
    back: (historical = false) => {
      const previous = readVerificationReturn(expertId);
      router.replace(previous?.target === location.pathname + location.search ? previous.href : historical ? "/expert-verification/my-work" : "/expert-verification", { scroll: false });
    },
  };
}

export function useRestoreVerificationList(ready: boolean) {
  const expertId = useVerificationNavigationIdentity();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    if (!ready) return;
    let frame = 0, second = 0;
    function restore() {
      const previous = readVerificationReturn(expertId);
      if (!previous?.restore || previous.href !== location.pathname + location.search) return;
      cancelAnimationFrame(frame); cancelAnimationFrame(second);
      frame = requestAnimationFrame(() => { second = requestAnimationFrame(() => {
        const row = previous.row ? document.querySelector<HTMLElement>(`[data-verification-row="${CSS.escape(previous.row)}"]`) : null;
        window.scrollTo({ top: Math.max(0, row ? window.scrollY + row.getBoundingClientRect().top - previous.offset : previous.scroll), behavior: "instant" });
        row?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
        consumeVerificationReturn(expertId);
      }); });
    }
    function onPageShow(event: PageTransitionEvent) { if (event.persisted) restore(); }
    restore();
    window.addEventListener("pageshow", onPageShow);
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(second); window.removeEventListener("pageshow", onPageShow); };
  }, [expertId, ready, pathname, search]);
}
