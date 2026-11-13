"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
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
      <Command shouldFilter={false} className="rounded-lg border border-border bg-card">
        <CommandInput
          value={input}
          onValueChange={setInput}
          disabled={disabled}
          placeholder="Tìm hợp đồng theo tên…"
          aria-label="Tìm hợp đồng theo tên"
          className="text-ui"
        />
        <CommandList aria-label="Hợp đồng để thêm phiên bản" className="max-h-56">
          {query.isPending && <p className="m-0 px-3 py-3 text-ui-meta text-muted-foreground">Đang tìm hợp đồng…</p>}
          {!query.isPending && (
            <CommandEmpty className="px-3 py-3 text-ui-meta text-muted-foreground">
              {term ? `Không tìm thấy hợp đồng nào có tên chứa “${term}”.` : "Chưa có hợp đồng nào để thêm phiên bản."}
            </CommandEmpty>
          )}
          {items.map((contract) => {
            const picked = toPicked(contract);
            if (!picked) return null;
            const selected = value?.id === picked.id;
            return (
              <CommandItem
                key={picked.id}
                value={picked.id}
                disabled={disabled}
                onSelect={() => onSelect(picked)}
                className="items-start gap-2.5 rounded-none border-b border-border px-3 py-2.5 last:border-b-0"
              >
                <Check aria-hidden="true" className={`mt-0.5 text-primary! ${selected ? "opacity-100" : "opacity-0"}`} />
                <span className="min-w-0">
                  <span className={`block truncate text-ui font-semibold ${selected ? "text-primary" : "text-foreground"}`}>
                    {picked.title}
                    <span className="ml-2 text-ui-caption text-primary">v{picked.versionNumber}</span>
                  </span>
                  <span className="mt-0.5 block text-ui-meta text-muted-foreground">
                    {contractTypeLabels[contract.type ?? ""] ?? "Chưa xác định loại"} · Cập nhật {formatContractDate(contract.updatedAt)}
                  </span>
                </span>
              </CommandItem>
            );
          })}
        </CommandList>
      </Command>
      {query.data && query.data.total > 10 && !term && (
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
          <Badge variant={number === current ? "info" : "outline"} className="rounded-md">
            v{number}{number === current ? " · hiện tại" : ""}
          </Badge>
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="text-slate-400">──</span>
        <Badge variant="success" className="rounded-md border-dashed border-emerald-400">v{next} · sắp tạo</Badge>
      </li>
    </ol>
  );
}
