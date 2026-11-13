"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { contractTypeLabels, formatContractDate } from "@/config/contract-display";
import { useContractsList } from "@/hooks/contracts/use-contracts";
import type { DashboardContract } from "@/types/contracts";

export type PickedContract = { id: string; title: string; versionNumber: number };

function toPicked(contract: DashboardContract): PickedContract | null {
  const id = contract.id ?? contract._id;
  if (!id) return null;
  return { id, title: contract.title, versionNumber: contract.currentVersion?.versionNumber ?? 1 };
}

export function ContractSearchPicker({ value, excludeId, disabled, onSelect }: {
  value: PickedContract | null;
  excludeId?: string;
  disabled?: boolean;
  onSelect: (contract: PickedContract) => void;
}) {
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setTerm(input.trim()), 300);
    return () => clearTimeout(timer);
  }, [input]);
  const query = useContractsList({ search: term || undefined, page: 1 }, { scope: "version-picker" });
  const items = (query.data?.items ?? []).filter((contract) => {
    const id = contract.id ?? contract._id;
    return id !== excludeId && contract.status !== "unsupported" && contract.status !== "archived";
  });

  return (
    <div className="grid gap-2">
      <label className="relative block">
        <span className="sr-only">Tìm hợp đồng theo tên</span>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={input}
          disabled={disabled}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Tìm hợp đồng theo tên…"
          className="h-10 w-full rounded-lg border border-[color:var(--line,#e4e8ef)] bg-white pl-9 pr-3 text-ui"
        />
      </label>
      <div role="listbox" aria-label="Hợp đồng để thêm phiên bản" className="max-h-56 overflow-y-auto rounded-lg border border-[color:var(--line,#e4e8ef)] bg-white">
        {query.isPending && <p className="m-0 px-3 py-3 text-ui-meta text-muted-foreground">Đang tìm hợp đồng…</p>}
        {!query.isPending && items.length === 0 && (
          <p className="m-0 px-3 py-3 text-ui-meta text-muted-foreground">
            {term ? `Không tìm thấy hợp đồng nào có tên chứa “${term}”.` : "Chưa có hợp đồng nào để thêm phiên bản."}
          </p>
        )}
        {items.map((contract) => {
          const picked = toPicked(contract);
          if (!picked) return null;
          const selected = value?.id === picked.id;
          return (
            <button
              key={picked.id}
              type="button"
              role="option"
              aria-selected={selected}
              disabled={disabled}
              onClick={() => onSelect(picked)}
              className={`block w-full border-b border-[#edf0f4] px-3 py-2.5 text-left last:border-b-0 ${selected ? "bg-[#f2f7ff]" : "hover:bg-slate-50"}`}
            >
              <span className={`block truncate text-ui font-semibold ${selected ? "text-primary" : "text-[#1f2d44]"}`}>
                {picked.title}
                <span className="ml-2 text-ui-caption text-blue-700">v{picked.versionNumber}</span>
              </span>
              <span className="mt-0.5 block text-ui-meta text-muted-foreground">
                {contractTypeLabels[contract.type ?? ""] ?? "Chưa xác định loại"} · Cập nhật {formatContractDate(contract.updatedAt)}
              </span>
            </button>
          );
        })}
      </div>
      {query.data && query.data.total > items.length && !term && (
        <p className="m-0 text-ui-meta text-muted-foreground">Đang hiện 10 hợp đồng gần nhất. Gõ tên để tìm hợp đồng cũ hơn.</p>
      )}
    </div>
  );
}

export function VersionPath({ current, next }: { current: number; next: number }) {
  const shown = current <= 4 ? Array.from({ length: current }, (_, index) => index + 1) : [1, current];
  return (
    <ol aria-label={`Hiện có ${current} phiên bản, tệp mới sẽ là phiên bản ${next}`} className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 text-ui-meta">
      {shown.map((number, index) => (
        <li key={number} className="flex items-center gap-1.5">
          {index > 0 && <span aria-hidden="true" className="text-slate-400">{current > 4 && index === 1 ? "… ──" : "──"}</span>}
          <span className={`rounded-md border px-1.5 py-0.5 font-semibold ${number === current ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600"}`}>
            v{number}{number === current ? " · hiện tại" : ""}
          </span>
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="text-slate-400">──</span>
        <span className="rounded-md border border-dashed border-emerald-400 bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-800">v{next} · sắp tạo</span>
      </li>
    </ol>
  );
}
