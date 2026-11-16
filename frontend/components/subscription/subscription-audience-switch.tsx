"use client";

import { useId } from "react";
import type { PlanAudience } from "@/types/subscription";

export function SubscriptionAudienceSwitch({
  value,
  onChange,
  variant = "landing",
}: {
  value: PlanAudience;
  onChange: (value: PlanAudience) => void;
  variant?: "landing" | "catalog";
}) {
  const id = useId();
  const catalog = variant === "catalog";
  return (
    <fieldset
      className={
        catalog
          ? "inline-grid w-full max-w-[360px] grid-cols-2 gap-1 rounded-full border border-[#dde4ed] bg-[#e8edf4] p-[5px] text-sm font-medium text-[#52647d]"
          : "inline-grid grid-cols-2 gap-1 rounded-[14px] border border-[#e0e6ef] bg-[#eaf0f6] p-[5px] text-[14px] font-medium text-[#5e6c82]"
      }
    >
      <legend className="sr-only">Đối tượng sử dụng gói</legend>
      {(
        [
          ["personal", "Cá nhân"],
          ["business", "Tổ chức"],
        ] as const
      ).map(([audience, label]) => (
        <label key={audience} className="cursor-pointer">
          <input
            type="radio"
            name={`plan-audience-${id}`}
            value={audience}
            checked={value === audience}
            onChange={() => onChange(audience)}
            className="peer sr-only"
          />
          <span
            className={
              catalog
                ? "grid min-h-11 place-items-center rounded-full px-4 py-2 transition-colors peer-checked:bg-white peer-checked:font-semibold peer-checked:text-[#14213d] peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#2864dc] motion-reduce:transition-none"
                : "grid min-h-[42px] min-w-28 place-items-center rounded-[9px] px-[19px] py-2 transition-colors peer-checked:bg-[#13233d] peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#0066ff] motion-reduce:transition-none"
            }
          >
            {catalog && audience === "business" ? "Doanh nghiệp" : label}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
