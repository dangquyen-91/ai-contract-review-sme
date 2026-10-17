"use client";

import { useEffect, useRef, type RefObject } from "react";

// A request comes from the user's review action, never from polling or recovery.
export function useReviewTimelineScroll(request: number, sharedRef?: RefObject<HTMLDivElement | null>) {
  const localRef = useRef<HTMLDivElement>(null);
  const targetRef = sharedRef ?? localRef;

  useEffect(() => {
    if (!request) return;
    // Wait for the upload dialog to unmount and restore focus before scrolling.
    const frame = window.requestAnimationFrame(() => {
      targetRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [request, targetRef]);

  return targetRef;
}
