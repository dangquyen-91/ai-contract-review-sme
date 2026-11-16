"use client";

import { Library, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLegalSourceCatalog } from "@/hooks/legal-sources/use-legal-sources";

export function LegalSourceCatalogGaps({ disabled, onAdd }: { disabled: boolean; onAdd: (code: string) => void }) {
  const catalog = useLegalSourceCatalog();
  if (!catalog.data) return null;
  const missing = catalog.data.filter((entry) => !entry.legalSource);
  return (
    <section aria-label="Danh mục văn bản luật" className="mb-7 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
      <header className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary"><Library aria-hidden="true" className="size-5" /></span>
        <div className="min-w-0">
          <h2 className="text-ui-section font-semibold">
            Danh mục văn bản luật
            <span className="ml-1 rounded-md bg-muted px-2 py-0.5 text-ui-meta tabular-nums">{catalog.data.length - missing.length}/{catalog.data.length}</span>
          </h2>
          <p className="mt-1 text-ui-meta text-muted-foreground">Văn bản hệ thống dùng khi rà soát hợp đồng. Văn bản chưa có trong kho sẽ không được trích dẫn.</p>
        </div>
      </header>
      {missing.length ? (
        <ul className="divide-y divide-border">
          {missing.map((entry) => (
            <li key={entry.code} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-ui font-semibold">{entry.label}</p>
                <p className="mt-1 break-words text-ui-meta text-muted-foreground">
                  {entry.code}
                  {entry.usedByProfiles.length > 0 && ` · Dùng cho: ${entry.usedByProfiles.map((profile) => profile.name).join(", ")}`}
                </p>
              </div>
              <Button variant="outline" size="sm" className="h-10 self-start sm:self-center" disabled={disabled} onClick={() => onAdd(entry.code)}>
                <Plus aria-hidden="true" />Thêm nguồn
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex items-start gap-3 p-5 text-ui text-muted-foreground">
          <ShieldCheck aria-hidden="true" className="size-5 shrink-0 text-emerald-700" />
          <p>Kho đã có đủ các văn bản trong danh mục.</p>
        </div>
      )}
    </section>
  );
}
