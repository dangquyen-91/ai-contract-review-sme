import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusCard<T extends string> = {
  value: T;
  label: string;
  description: string;
  icon: LucideIcon;
};

export function VerificationStatusCards<T extends string>({
  value,
  onChange,
  items,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  items: readonly StatusCard<T>[];
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "grid gap-2 md:gap-3",
        items.length === 4 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-3",
      )}
    >
      {items.map(({ value: group, label, description, icon: Icon }) => {
        const active = value === group;
        return (
          <button
            key={group}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(group)}
            className={cn(
              "group flex min-w-0 flex-col items-center gap-2 rounded-2xl border bg-white p-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315eac] focus-visible:ring-offset-2 motion-reduce:transition-none md:flex-row md:items-start md:gap-3 md:p-4 md:text-left lg:p-5",
              active
                ? "border-[#abc3e8] bg-[#f2f6fd] shadow-[0_3px_12px_-8px_#315eac70]"
                : "border-[#e1e5ec] hover:border-[#abc3e8] hover:bg-[#fafbfe]",
            )}
          >
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-xl",
                active
                  ? "bg-[#315eac] text-white"
                  : "bg-[#f1f4f9] text-[#65738a]",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block text-xs font-semibold leading-5 md:text-sm",
                  active ? "text-[#244d8b]" : "text-[#28364c]",
                )}
              >
                {label}
              </span>
              <span className="mt-1 hidden text-xs leading-5 text-[#6b778a] md:block">
                {description}
              </span>
            </span>
            <ArrowUpRight
              className={cn(
                "mt-0.5 hidden size-4 shrink-0 md:block",
                active ? "text-[#315eac]" : "text-[#a2adbc]",
              )}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
