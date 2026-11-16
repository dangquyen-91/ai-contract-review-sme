"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import type { VersionMatch } from "@/types/contracts";
import { ContractSearchPicker, VersionPath, type PickedContract } from "./contract-search-picker";

export type UploadIdentity = { mode: "new" } | { mode: "version"; target: PickedContract };

export function defaultIdentity(match: VersionMatch | null): UploadIdentity {
  if (!match || match.sameParties === false) return { mode: "new" };
  return { mode: "version", target: { id: match.contractId, title: match.title, versionNumber: match.currentVersionNumber } };
}

function Option({ checked, disabled, onSelect, title, detail }: {
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  title: string;
  detail?: string;
}) {
  return (
    <label className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-ui leading-5 ${checked ? "border-primary bg-white" : "border-transparent hover:bg-white/70"}`}>
      <input type="radio" name="upload-identity" className="mt-1" checked={checked} disabled={disabled} onChange={onSelect} />
      <span className="min-w-0">
        <strong className="block font-semibold [overflow-wrap:anywhere]">{title}</strong>
        {detail && <small className="mt-0.5 block text-ui-meta text-muted-foreground">{detail}</small>}
      </span>
    </label>
  );
}

export function UploadIdentityChoice({ contractId, match, value, disabled, onChange }: {
  contractId: string;
  match: VersionMatch | null;
  value: UploadIdentity;
  disabled?: boolean;
  onChange: (value: UploadIdentity) => void;
}) {
  const [picking, setPicking] = useState(false);
  const matchTarget = match ? { id: match.contractId, title: match.title, versionNumber: match.currentVersionNumber } : null;
  const chosen = value.mode === "version" ? value.target : null;
  const pickedOther = chosen && chosen.id !== matchTarget?.id;
  const percent = match ? Math.round(match.similarity * 100) : 0;

  if (!match && !picking && !chosen) {
    return (
      <button type="button" disabled={disabled} onClick={() => setPicking(true)} className="mb-4 inline-flex items-center gap-1.5 p-0 text-ui-meta font-semibold text-primary hover:underline">
        <Layers aria-hidden="true" className="size-3.5" />
        Đây là bản mới của một hợp đồng đã có?
      </button>
    );
  }

  return (
    <section aria-label="Tệp này là gì" className="mb-4 rounded-lg border border-blue-200 bg-blue-50/60 p-3.5">
      <p className="m-0 mb-2 text-ui font-semibold text-blue-950">
        {match ? "Có vẻ đây là bản mới của một hợp đồng đã có" : "Lưu thành phiên bản mới của hợp đồng đã có"}
      </p>
      <div className="grid gap-1.5">
        {match && matchTarget && (
          <Option
            checked={chosen?.id === matchTarget.id}
            disabled={disabled}
            onSelect={() => { setPicking(false); onChange({ mode: "version", target: matchTarget }); }}
            title={`Phiên bản ${match.nextVersionNumber} của “${match.title}”`}
            detail={`Giống ${percent}% với phiên bản ${match.matchedVersionNumber}${match.sameParties ? " · cùng các bên ký" : ""}`}
          />
        )}
        {pickedOther && chosen && (
          <Option checked disabled={disabled} onSelect={() => undefined} title={`Phiên bản ${chosen.versionNumber + 1} của “${chosen.title}”`} detail="Hợp đồng bạn tự chọn" />
        )}
        <Option
          checked={value.mode === "new"}
          disabled={disabled}
          onSelect={() => { setPicking(false); onChange({ mode: "new" }); }}
          title="Hợp đồng mới, không liên quan"
          detail="Tạo một hợp đồng riêng trong danh sách"
        />
      </div>
      {match?.sameParties === false && (
        <p className="mb-0 mt-2 text-ui-meta leading-5 text-amber-900">
          Các bên ký khác nhau. Hai hợp đồng có thể chỉ dùng chung một mẫu.
        </p>
      )}
      {chosen && (
        <div className="mt-3">
          <VersionPath current={chosen.versionNumber} next={chosen.versionNumber + 1} />
          <p className="mb-0 mt-1.5 text-ui-meta text-muted-foreground">Loại hợp đồng và vai trò của bạn được giữ theo hợp đồng đã có.</p>
        </div>
      )}
      {picking ? (
        <div className="mt-3">
          <ContractSearchPicker
            value={chosen}
            excludeId={contractId}
            disabled={disabled}
            onSelect={(target) => { setPicking(false); onChange({ mode: "version", target }); }}
          />
        </div>
      ) : (
        <button type="button" disabled={disabled} onClick={() => setPicking(true)} className="mt-2 p-0 text-ui-meta font-semibold text-primary hover:underline">
          Chọn hợp đồng khác
        </button>
      )}
    </section>
  );
}
