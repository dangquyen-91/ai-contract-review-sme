"use client";

import { RadioGroup } from "radix-ui";

const choices = [
  { value: "all", label: "Tất cả" },
  { value: "not_sent", label: "Chưa gửi chuyên gia" },
  { value: "requested", label: "Chờ tiếp nhận" },
  { value: "in_progress", label: "Đang kiểm tra" },
  { value: "approved", label: "Đã xác minh" },
  { value: "returned", label: "Đã trả lại" },
];

export function ContractVerificationTabs({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="min-w-0 overflow-x-auto overscroll-x-contain">
      <RadioGroup.Root aria-label="Lọc xác minh chuyên gia" orientation="horizontal" loop
        value={value || "all"} onValueChange={(next) => onChange(next === "all" ? "" : next)}
        className="flex w-max min-w-full gap-1 border-b border-border px-4 sm:px-5">
        {choices.map((choice) => (
          <RadioGroup.Item key={choice.value} value={choice.value}
            className="relative shrink-0 cursor-pointer whitespace-nowrap border-b-2 border-transparent px-3 py-3.5 text-ui-meta font-medium text-muted-foreground outline-none transition-colors hover:bg-muted/50 hover:text-card-foreground focus-visible:z-10 focus-visible:rounded-t-md focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary data-[state=checked]:border-primary data-[state=checked]:font-semibold data-[state=checked]:text-primary motion-reduce:transition-none">
            {choice.label}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </div>
  );
}
