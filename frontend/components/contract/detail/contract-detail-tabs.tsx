"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { contractDetailTabs, type ContractDetailTab } from "@/hooks/contracts/use-contract-detail-tab";

const tabLabels: Record<ContractDetailTab, string> = {
  overview: "Tổng quan",
  risks: "Rủi ro & văn bản",
  terms: "Thông tin chính",
  chat: "Hỏi đáp",
  versions: "Phiên bản",
};

export function ContractDetailTabs({ tab, onSelect, counts, panels }: {
  tab: ContractDetailTab;
  onSelect: (tab: ContractDetailTab) => void;
  counts: Partial<Record<ContractDetailTab, number>>;
  panels: Record<ContractDetailTab, () => ReactNode>;
}) {
  const [visited, setVisited] = useState<ContractDetailTab[]>([tab]);
  const buttons = useRef<Partial<Record<ContractDetailTab, HTMLButtonElement | null>>>({});
  if (!visited.includes(tab)) setVisited([...visited, tab]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = contractDetailTabs.indexOf(tab);
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = contractDetailTabs[(index + step + contractDetailTabs.length) % contractDetailTabs.length];
    onSelect(next);
    buttons.current[next]?.focus();
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-[#e4e8ef] bg-white shadow-[0_22px_50px_-48px_rgb(23_45_78_/_0.7)]">
      <div role="tablist" aria-label="Nội dung hợp đồng" onKeyDown={onKeyDown} className="flex gap-1 overflow-x-auto border-b border-[#e4e8ef] bg-[#fbfcfe] px-3">
        {contractDetailTabs.map((key) => {
          const selected = key === tab;
          return (
            <button
              key={key}
              ref={(element) => { buttons.current[key] = element; }}
              type="button"
              role="tab"
              id={`contract-tab-${key}`}
              aria-selected={selected}
              aria-controls={`contract-panel-${key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(key)}
              className={`relative inline-flex min-h-12 shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-ui font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50 ${selected ? "text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary" : "text-[#5e6e84] hover:text-[#1f2d44]"}`}
            >
              {tabLabels[key]}
              {counts[key] !== undefined && (
                <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-ui-caption font-bold tabular-nums ${selected ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"}`}>
                  {counts[key]}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {visited.map((key) => (
        <div key={key} role="tabpanel" id={`contract-panel-${key}`} aria-labelledby={`contract-tab-${key}`} hidden={key !== tab}>
          {panels[key]()}
        </div>
      ))}
    </div>
  );
}
