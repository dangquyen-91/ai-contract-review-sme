"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStudioLawPreview } from "@/hooks/contract-drafts/use-studio-laws";
import { StudioLawAttributes } from "./studio-law-attributes";
import { StudioLawDocument } from "./studio-law-document";

export function StudioLawPreview({
  id,
  onBack,
}: {
  id: string;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<"content" | "attributes">("content");
  const query = useStudioLawPreview(id);
  const scroll = useRef<HTMLDivElement>(null);
  const more = useRef<HTMLDivElement>(null);
  const tabsId = useId();
  const source = query.data?.pages[0].source;
  const {
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
  } = query;
  useEffect(() => {
    const sentinel = more.current;
    if (
      tab !== "content" ||
      !sentinel ||
      !hasNextPage ||
      isFetchingNextPage ||
      isFetchNextPageError
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void fetchNextPage();
      },
      { root: scroll.current, rootMargin: "160px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    tab,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
  ]);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onBack();
      }}
    >
      <DialogContent
        className={`flex min-h-0 flex-col gap-4 overflow-hidden rounded-xl bg-[#f8fafc] p-5 sm:max-w-[800px] sm:p-6 ${tab === "content" ? "h-[min(900px,calc(100dvh-2rem))]" : "max-h-[calc(100dvh-2rem)]"}`}
      >
        <DialogHeader className="shrink-0 pr-8 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Xem nội dung văn bản
          </DialogTitle>
          <DialogDescription className="sr-only">
            Nội dung và thuộc tính văn bản lấy từ kho dữ liệu pháp lý của hệ
            thống.
          </DialogDescription>
        </DialogHeader>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <div
            role="tablist"
            aria-label="Thông tin văn bản"
            className="inline-flex rounded-xl bg-slate-100 p-1"
          >
            {(
              [
                ["content", "Nội dung"],
                ["attributes", "Thuộc tính"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                id={`${tabsId}-${value}`}
                aria-controls={`${tabsId}-${value}-panel`}
                aria-selected={tab === value}
                tabIndex={tab === value ? 0 : -1}
                onKeyDown={(event) => {
                  if (
                    ["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                      event.key,
                    )
                  ) {
                    event.preventDefault();
                    const next =
                      event.key === "Home"
                        ? "content"
                        : event.key === "End"
                          ? "attributes"
                          : tab === "content"
                            ? "attributes"
                            : "content";
                    setTab(next);
                    document.getElementById(`${tabsId}-${next}`)?.focus();
                  }
                }}
                onClick={() => setTab(value)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition focus-visible:outline-2 focus-visible:outline-blue-500 ${tab === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-600"
          >
            <ArrowLeft size={13} />
            Quay lại danh sách luật
          </button>
        </div>
        <div
          ref={scroll}
          role="tabpanel"
          id={`${tabsId}-${tab}-panel`}
          aria-labelledby={`${tabsId}-${tab}`}
          tabIndex={0}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
        >
          {query.isPending ? (
            <div
              role="status"
              className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500"
            >
              <LoaderCircle className="size-4 animate-spin" />
              Đang tải văn bản…
            </div>
          ) : !source ? (
            <div
              role="alert"
              className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
            >
              Chưa tải được văn bản. Văn bản có thể đã thay đổi trạng thái.
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3 flex"
                onClick={() => void query.refetch()}
              >
                Thử lại
              </Button>
            </div>
          ) : tab === "attributes" ? (
            <StudioLawAttributes source={source} />
          ) : (
            <>
              <StudioLawDocument
                source={source}
                chunks={query.data?.pages.flatMap((page) => page.chunks) ?? []}
              />
              <div ref={more} className="py-5 text-center">
                {hasNextPage && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isFetchingNextPage}
                    onClick={() => void fetchNextPage()}
                  >
                    {isFetchingNextPage ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" />
                        Đang tải nội dung…
                      </>
                    ) : isFetchNextPageError ? (
                      "Thử tải lại nội dung"
                    ) : (
                      "Xem tiếp nội dung"
                    )}
                  </Button>
                )}
                {!hasNextPage && (
                  <p className="text-[11px] text-slate-400">
                    Đã hiển thị nội dung đang lưu trong kho dữ liệu.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
