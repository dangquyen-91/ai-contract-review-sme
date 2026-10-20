"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { toast } from "sonner";

export function useReviewResultNavigation({ resultKey, title, timelineRef, resultRef, onOpenResult }: {
  resultKey?: string;
  title?: string;
  timelineRef: RefObject<HTMLDivElement | null>;
  resultRef: RefObject<HTMLDivElement | null>;
  onOpenResult?: () => void;
}) {
  const toastId = useRef<string | number | null>(null);
  const showResult = useCallback(() => {
    const target = resultRef.current;
    if (target) {
      target.scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
      target.focus({ preventScroll: true });
    } else onOpenResult?.();
    if (toastId.current !== null) toast.dismiss(toastId.current);
  }, [resultRef, onOpenResult]);

  useEffect(() => {
    if (!resultKey) return;
    const notify = () => {
      toastId.current = toast.success("Kết quả đã sẵn sàng", {
        description: title,
        duration: Infinity,
        closeButton: true,
        action: { label: "Xem kết quả", onClick: showResult },
      });
    };
    const hidden = document.visibilityState === "hidden";
    // Background tabs may suspend animation frames; their notification must not
    // turn into an automatic scroll when the user returns.
    if (hidden) notify();
    const frame = hidden ? undefined : window.requestAnimationFrame(() => {
      const bounds = timelineRef.current?.getBoundingClientRect();
      // Check at completion, not at the start of the run: the reader may have moved.
      const nearTimeline = bounds && bounds.top <= window.innerHeight * 0.75 && bounds.bottom >= window.innerHeight * 0.25;
      const interacting = document.activeElement?.closest('textarea, select, input:not([type="file"]), [contenteditable="true"], [role="dialog"], dialog[open]');
      if (resultRef.current && nearTimeline && !interacting && document.visibilityState !== "hidden") {
        resultRef.current.scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
        return;
      }
      notify();
    });
    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      if (toastId.current !== null) { toast.dismiss(toastId.current); toastId.current = null; }
    };
  }, [resultKey, title, timelineRef, resultRef, showResult]);
}
