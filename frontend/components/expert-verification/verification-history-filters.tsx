import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verificationHistoryActions } from "@/config/verification-history";
import type {
  HistoryActionFilter,
  VerificationHistoryController,
} from "@/hooks/expert-verification/use-verification-history";

export function VerificationHistoryFilters({
  controller,
}: {
  controller: VerificationHistoryController;
}) {
  const { filter, attempts, applyFilters, reset } = controller;
  const hasFilters = filter.action !== "all" || filter.attempt !== "all";

  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-y border-[#e9edf3] bg-[#fafbfd] px-5 py-4 sm:px-6">
      <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
        <label className="min-w-0 space-y-2 text-xs font-medium text-[#65738a]">
          <span>Loại thao tác</span>
          <select
            value={filter.action}
            onChange={(event) =>
              applyFilters({
                action: event.target.value as HistoryActionFilter,
              })
            }
            className="h-10 w-full rounded-lg border border-[#dce3ed] bg-white px-3 text-sm text-[#28364c] [color-scheme:light] focus-visible:outline-2 focus-visible:outline-[#315eac] sm:min-w-48"
          >
            <option value="all">Tất cả thao tác</option>
            {Object.entries(verificationHistoryActions).map(([value, item]) => (
              <option key={value} value={value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 space-y-2 text-xs font-medium text-[#65738a]">
          <span>Lần xác minh</span>
          <select
            value={filter.attempt}
            onChange={(event) =>
              applyFilters({
                attempt:
                  event.target.value === "all"
                    ? "all"
                    : Number(event.target.value),
              })
            }
            className="h-10 w-full rounded-lg border border-[#dce3ed] bg-white px-3 text-sm text-[#28364c] [color-scheme:light] focus-visible:outline-2 focus-visible:outline-[#315eac] sm:min-w-48"
          >
            <option value="all">Tất cả các lần</option>
            {attempts.map((attempt) => (
              <option key={attempt} value={attempt}>
                Lần xác minh {attempt}
              </option>
            ))}
          </select>
        </label>
      </div>
      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          className="h-10 text-xs text-[#315eac]"
        >
          <X className="size-3.5" aria-hidden="true" />
          Xóa bộ lọc
        </Button>
      ) : (
        <p className="m-0 flex items-center gap-1.5 py-2 text-xs text-[#7a8698]">
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          Lọc theo nội dung cần đối chiếu
        </p>
      )}
    </div>
  );
}
