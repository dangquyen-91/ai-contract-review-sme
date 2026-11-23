import { Clock3 } from "lucide-react";
import { verificationDate } from "@/lib/review/verification-display";

export function VerificationListPerson({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toLocaleUpperCase("vi-VN");

  return (
    <div className="flex items-center gap-2.5">
      <span
        className="grid size-8 shrink-0 place-items-center rounded-full bg-[#edf0f5] text-[10px] font-semibold text-[#66778e]"
        aria-hidden="true"
      >
        {initials}
      </span>
      <span className="break-words text-sm leading-6 text-[#4c5c73] [overflow-wrap:anywhere]">
        {name}
      </span>
    </div>
  );
}

export function VerificationListDate({
  value,
  label,
}: {
  value?: string;
  label?: string;
}) {
  const date = value ? new Date(value) : null;
  if (!date || !Number.isFinite(date.getTime())) {
    return <span className="text-xs text-[#7a8698]">Chưa có thời gian</span>;
  }
  return (
    <div>
      {label && (
        <p className="mb-0 mt-0 text-[11px] leading-5 text-[#8792a2]">
          {label}
        </p>
      )}
      <time dateTime={value} title={verificationDate(value)} className="block">
        <span className="block text-sm leading-6 tabular-nums text-[#4c5c73]">
          {date.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-xs tabular-nums text-[#8792a2]">
          <Clock3 className="size-3" aria-hidden="true" />
          {date.toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Ho_Chi_Minh",
          })}{" "}
          · GMT+7
        </span>
      </time>
    </div>
  );
}
