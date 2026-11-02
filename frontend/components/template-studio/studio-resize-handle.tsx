"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import styles from "@/styles/template-studio.module.css";

export function StudioResizeHandle({
  onResize,
}: {
  onResize: (width: number | null) => void;
}) {
  const [width, setWidth] = useState(420);
  const [maximum, setMaximum] = useState(600);
  const [dragging, setDragging] = useState(false);
  const handle = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = handle.current;
    const panel = element?.previousElementSibling;
    const workspace = element?.parentElement;
    if (!panel || !workspace) return;
    const observer = new ResizeObserver(() => {
      const measured = panel.getBoundingClientRect().width;
      if (measured) setWidth(Math.round(measured));
      setMaximum(
        Math.max(
          320,
          Math.min(600, workspace.getBoundingClientRect().width - 560),
        ),
      );
    });
    observer.observe(panel);
    observer.observe(workspace);
    return () => observer.disconnect();
  }, []);

  function resize(element: HTMLElement, value: number) {
    const available =
      element.parentElement?.getBoundingClientRect().width ?? 1030;
    const next = Math.round(
      Math.max(320, Math.min(600, available - 560, value)),
    );
    setWidth(next);
    onResize(next);
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const left =
      event.currentTarget.parentElement!.getBoundingClientRect().left;
    resize(event.currentTarget, event.clientX - left);
  }

  return (
    <div
      ref={handle}
      role="separator"
      tabIndex={0}
      aria-label="Điều chỉnh độ rộng trợ lý"
      aria-orientation="vertical"
      aria-valuemin={320}
      aria-valuemax={maximum}
      aria-valuenow={width}
      title="Kéo để chỉnh độ rộng · Nhấp đúp để đặt lại"
      className={`${styles.resizeHandle} ${dragging ? styles.resizeHandleActive : ""}`}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={move}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
        setDragging(false);
      }}
      onLostPointerCapture={() => setDragging(false)}
      onDoubleClick={() => onResize(null)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          const current =
            event.currentTarget.previousElementSibling?.getBoundingClientRect()
              .width ?? width;
          resize(
            event.currentTarget,
            current + (event.key === "ArrowRight" ? 24 : -24),
          );
        } else if (event.key === "Home") {
          event.preventDefault();
          onResize(null);
        }
      }}
    >
      <span />
    </div>
  );
}

export function studioPanelStyle(
  width: number | null,
): CSSProperties | undefined {
  return width === null
    ? undefined
    : ({ "--studio-chat-width": `${width}px` } as CSSProperties);
}
