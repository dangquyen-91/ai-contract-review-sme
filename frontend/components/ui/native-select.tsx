import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Shared look of native form fields (select, date) in list toolbars and forms. */
export const nativeFieldClass =
  "h-11 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";

export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(nativeFieldClass, className)} {...props} />;
}
