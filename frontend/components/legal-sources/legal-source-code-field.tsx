"use client";

import { useId, useState } from "react";
import { useLegalSourceCatalog } from "@/hooks/legal-sources/use-legal-sources";
import type { LegalSourceCatalogEntry } from "@/types/legal-sources";
import { legalSourceFieldClass as field } from "./legal-source-file-fields";

function codeHint(code: string, catalog?: LegalSourceCatalogEntry[]) {
  if (!catalog) return { warning: false, text: "Mã duy nhất gồm chữ thường, số và dấu gạch dưới." };
  if (!code) return { warning: false, text: "Chọn mã trong danh mục để văn bản được dùng khi rà soát hợp đồng." };
  const entry = catalog.find((item) => item.code === code);
  if (!entry) return { warning: true, text: "Mã ngoài danh mục: nguồn không gắn với loại hợp đồng nào, chỉ được tra cứu khi kho chưa có văn bản chính của hợp đồng đang rà soát." };
  if (entry.legalSource) return { warning: true, text: `Mã này đã có nguồn “${entry.legalSource.title}” trong kho.` };
  const profiles = entry.usedByProfiles.map((profile) => profile.name).join(", ");
  const usage = [
    profiles && `Dùng khi rà soát: ${profiles}.`,
    entry.ruleCodes.length > 0 && `Là căn cứ của ${entry.ruleCodes.length} quy tắc pháp lý cố định.`,
  ].filter(Boolean).join(" ");
  return { warning: false, text: `${entry.label}. ${usage || "Chưa gắn với loại hợp đồng hay quy tắc nào."}` };
}

export function LegalSourceCodeField({ defaultCode = "" }: { defaultCode?: string }) {
  const catalog = useLegalSourceCatalog();
  const listId = useId();
  const [code, setCode] = useState(defaultCode);
  const hint = codeHint(code.trim().toLowerCase(), catalog.data);
  return (
    <label className="grid gap-2 text-ui">
      Mã nguồn *
      <input
        name="code"
        required
        minLength={2}
        maxLength={60}
        pattern="[a-z0-9]+(_[a-z0-9]+)*"
        placeholder="commercial_law_2005"
        list={listId}
        autoComplete="off"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        className={field}
      />
      <datalist id={listId}>
        {catalog.data?.filter((entry) => !entry.legalSource).map((entry) => (
          <option key={entry.code} value={entry.code}>{entry.label}</option>
        ))}
      </datalist>
      <span className={`text-ui-meta ${hint.warning ? "text-amber-800" : "text-muted-foreground"}`}>{hint.text}</span>
    </label>
  );
}
