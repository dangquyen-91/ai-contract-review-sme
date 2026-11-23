"use client";

import {
  ArrowDownWideNarrow,
  ChevronDown,
  History,
  ListFilter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVerificationHistory } from "@/hooks/expert-verification/use-verification-history";
import { VerificationHistoryFilters } from "./verification-history-filters";
import { VerificationHistoryItem } from "./verification-history-item";
import type { VerificationAction } from "@/types/verification-workspace";

export function VerificationHistory({
  history,
}: {
  history: VerificationAction[];
}) {
  const controller = useVerificationHistory(history);
  const { items, total, remaining, nextCount, showMore } = controller;

  return (
    <details className="group/history overflow-hidden rounded-2xl border border-[#e1e5ec] bg-white text-[#28364c] shadow-[0_8px_30px_-24px_#34496740]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl p-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#315eac] sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1f4f9] text-[#5279b3]">
            <History className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2 text-base font-semibold">
              Lịch sử thao tác
              <span className="rounded-md bg-[#eef2f8] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#526782]">
                {history.length}
              </span>
            </span>
            <span className="mt-1 block text-xs leading-5 text-[#7a8698]">
              Theo dõi quyết định và nội dung thay đổi qua từng lần xác minh.
            </span>
          </span>
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-[#8792a2] transition-transform group-open/history:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </summary>
      {!history.length ? (
        <p className="m-0 border-t border-[#e9edf3] px-5 py-8 text-center text-sm text-[#7a8698]">
          Chưa có thao tác xác minh.
        </p>
      ) : (
        <>
          <VerificationHistoryFilters controller={controller} />
          <div className="px-4 py-5 sm:px-6">
            {total ? (
              <>
                <p className="mb-5 mt-0 flex items-center gap-1.5 text-xs text-[#7a8698]">
                  <ArrowDownWideNarrow
                    className="size-3.5"
                    aria-hidden="true"
                  />
                  Mới nhất trước
                </p>
                <ol
                  aria-label="Các thao tác xác minh"
                  className="m-0 list-none p-0"
                >
                  {items.map((item, index) => (
                    <VerificationHistoryItem
                      key={item._id}
                      item={item}
                      last={index === items.length - 1}
                    />
                  ))}
                </ol>
              </>
            ) : (
              <div className="px-3 py-6 text-center">
                <ListFilter
                  className="mx-auto size-7 text-[#8a97aa]"
                  aria-hidden="true"
                />
                <p
                  role="status"
                  className="mb-0 mt-3 text-sm font-medium text-[#526782]"
                >
                  Không có thao tác phù hợp.
                </p>
                <p className="mb-0 mt-1 text-xs leading-5 text-[#7a8698]">
                  Thử đổi loại thao tác hoặc lần xác minh.
                </p>
              </div>
            )}
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e9edf3] bg-[#fafbfd] px-5 py-4 sm:px-6">
            <p
              role="status"
              className="m-0 text-xs leading-5 tabular-nums text-[#7a8698]"
            >
              Hiển thị {items.length}/{total} thao tác phù hợp
            </p>
            {remaining > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={showMore}
                className="w-full border-[#dce3ed] text-xs text-[#315eac] sm:w-auto"
              >
                Xem thêm {nextCount} thao tác
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </Button>
            )}
          </footer>
        </>
      )}
    </details>
  );
}
