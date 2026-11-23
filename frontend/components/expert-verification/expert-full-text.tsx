"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import { useExpertFullText } from "@/hooks/expert-verification/use-expert-original-file";
import type { ExpertWorkspace } from "@/types/verification-workspace";

function uniqueRange(text: string, quote?: string | null) {
  const value = quote?.trim();
  if (!value) return null;
  const start = text.indexOf(value);
  if (start < 0 || text.indexOf(value, start + value.length) >= 0) return null;
  return { start, end: start + value.length };
}

export function ExpertFullText({
  reviewId,
  attempt,
  clause,
  selection,
  active,
  layout,
}: {
  reviewId: string;
  attempt: number;
  clause?: ExpertWorkspace["clauses"][number];
  selection?: { request: number; focus?: boolean } | null;
  active?: boolean;
  layout?: string;
}) {
  const query = useExpertFullText(reviewId, attempt);
  const scrollArea = useRef<HTMLDivElement>(null);
  const target = useRef<HTMLElement | null>(null);
  const text = query.data?.text ?? "";
  // Masked clause text can differ from the full document. Locate only a unique
  // exact quote or heading; never apply offsets from the masked document.
  const range = clause
    ? (uniqueRange(text, clause.text) ?? uniqueRange(text, clause.title))
    : null;
  const locationStart = range?.start;

  useEffect(() => {
    if (
      !selection ||
      locationStart === undefined ||
      !target.current ||
      !scrollArea.current
    )
      return;
    const area = scrollArea.current;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    area.scrollTo({
      top:
        area.scrollTop +
        target.current.getBoundingClientRect().top -
        area.getBoundingClientRect().top -
        area.clientHeight / 2,
      behavior: reduced ? "instant" : "smooth",
    });
    if (selection.focus !== false)
      target.current.focus({ preventScroll: true });
  }, [selection, locationStart, text, active, layout]);

  return (
    <div ref={scrollArea} className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      {query.isPending ? (
        <p role="status" className="text-ui text-muted-foreground">
          Đang tải văn bản đầy đủ…
        </p>
      ) : query.isError ? (
        <div role="alert" className="space-y-2 text-ui">
          <p>
            Chưa mở được văn bản đầy đủ. Vui lòng kiểm tra quyền chia sẻ và thử
            lại.
          </p>
          <Button
            variant="outline"
            size="sm"
            loading={query.isFetching}
            onClick={() => {
              void query.refetch();
            }}
          >
            Thử tải lại
          </Button>
        </div>
      ) : text.trim() ? (
        <>
          {clause && !range && (
            <p
              role="status"
              className="mb-4 mt-0 rounded-lg border border-amber-200 bg-amber-50 p-3 text-ui-meta leading-6 text-amber-950"
            >
              Chưa định vị được chính xác điều khoản trong văn bản đầy đủ. Bạn
              có thể đối chiếu trực tiếp nội dung bên dưới.
            </p>
          )}
          <div className="whitespace-pre-wrap break-words font-serif text-ui-document leading-8 [overflow-wrap:anywhere]">
            {range ? (
              <>
                {text.slice(0, range.start)}
                <mark
                  ref={target}
                  tabIndex={-1}
                  aria-label="Đoạn đang đối chiếu"
                  className="rounded bg-blue-100 text-blue-950 outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {text.slice(range.start, range.end)}
                </mark>
                {text.slice(range.end)}
              </>
            ) : (
              text
            )}
          </div>
        </>
      ) : (
        <p role="status" className="text-ui text-muted-foreground">
          Chưa có nội dung trích xuất. Hãy chọn “Xem file gốc” để đối chiếu.
        </p>
      )}
    </div>
  );
}
