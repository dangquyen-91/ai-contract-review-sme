"use client";

import { useEffect } from "react";
import { consumeContractListReturn, readContractListReturn, saveContractListReturn } from "@/lib/contracts/contract-list-return";

export function useContractListReturn(scope: string, ready: boolean, locationKey: string) {
  useEffect(() => {
    if (!ready) return;
    let frame = 0, nextFrame = 0;
    function restore() {
      const previous = readContractListReturn(scope);
      if (!previous?.restore || previous.href !== window.location.pathname + window.location.search) return;
      cancelAnimationFrame(frame); cancelAnimationFrame(nextFrame);
      frame = requestAnimationFrame(() => {
        nextFrame = requestAnimationFrame(() => {
          const card = document.querySelector<HTMLElement>(`[data-contract-id="${CSS.escape(previous.contractId)}"]`);
          const top = card ? window.scrollY + card.getBoundingClientRect().top - previous.offset : previous.scroll;
          window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
          card?.focus({ preventScroll: true });
          consumeContractListReturn(scope);
        });
      });
    }
    function onPageShow(event: PageTransitionEvent) { if (event.persisted) restore(); }
    restore();
    window.addEventListener("pageshow", onPageShow);
    return () => {
      cancelAnimationFrame(frame); cancelAnimationFrame(nextFrame);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [scope, ready, locationKey]);

  return (contractId: string) => saveContractListReturn(scope, contractId);
}
