import { Clock3, UserRound } from "lucide-react";
import { verificationHistoryActions } from "@/config/verification-history";
import { verificationDate } from "@/lib/review/verification-display";
import { VerificationActionComparison } from "./verification-action-comparison";
import type { VerificationAction } from "@/types/verification-workspace";

export function VerificationHistoryItem({
  item,
  last,
}: {
  item: VerificationAction;
  last: boolean;
}) {
  const { label, icon: Icon, tone } = verificationHistoryActions[item.action];
  const name =
    typeof item.expertId === "object" ? item.expertId?.name : undefined;
  const title = item.after?.title || item.before?.title;

  return (
    <li className="relative flex min-w-0 gap-3 pb-5 last:pb-0 sm:gap-4">
      {!last && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-[17px] top-10 w-px bg-[#e5eaf1]"
        />
      )}
      <span
        className={`relative mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border ${tone}`}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <article className="min-w-0 flex-1 rounded-xl border border-[#e5eaf1] bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="m-0 text-xs font-semibold text-[#526782]">{label}</p>
          <span className="rounded-md bg-[#f0f3f7] px-2 py-0.5 text-[11px] text-[#7a8698]">
            Lần xác minh {item.attempt}
          </span>
        </div>
        <h3 className="mb-0 mt-2 break-words text-sm font-semibold leading-6 text-[#28364c] [overflow-wrap:anywhere]">
          {title || "Vấn đề không có tiêu đề được lưu"}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs leading-5 text-[#7a8698]">
          <span className="inline-flex max-w-full min-w-0 items-start gap-1.5">
            <UserRound
              className="mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
              {name || "Chuyên gia"}
            </span>
          </span>
          <span className="inline-flex items-start gap-1.5">
            <Clock3 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>{verificationDate(item.createdAt)}</span>
          </span>
        </div>
        {item.reason?.trim() && (
          <div className="mt-3 rounded-lg border border-[#ecebe5] bg-[#fafaf7] px-3 py-2.5">
            <p className="m-0 text-[11px] font-semibold text-[#7b796c]">
              Lý do
            </p>
            <p className="mb-0 mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#596272] [overflow-wrap:anywhere]">
              {item.reason}
            </p>
          </div>
        )}
        <VerificationActionComparison action={item} />
      </article>
    </li>
  );
}
