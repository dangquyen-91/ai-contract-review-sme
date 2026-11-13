"use client";

import { Layers, X } from "lucide-react";
import { ContractSearchPicker, VersionPath, type PickedContract } from "./contract-search-picker";

export type VersionCandidate = { id: string; title: string; versionNumber?: number };

export type UploadTargetState = {
  mode: "new" | "version";
  contractId: string;
  note: string;
  contract?: PickedContract;
};

const linkButton = "inline-flex items-center gap-1.5 p-0 text-ui-meta font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline";

export function UploadTargetPicker({
  value,
  candidates,
  disabled,
  onChange,
}: {
  value: UploadTargetState;
  candidates: VersionCandidate[];
  disabled: boolean;
  onChange: (next: UploadTargetState) => void;
}) {
  const listed = candidates.find((candidate) => candidate.id === value.contractId);
  const selected: PickedContract | null = value.contract
    ?? (listed ? { id: listed.id, title: listed.title, versionNumber: listed.versionNumber ?? 1 } : null);

  if (value.mode === "new") {
    return (
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <p className="m-0 text-ui-meta text-muted-foreground">
          Nếu đây là bản sửa của hợp đồng đã có, hệ thống sẽ tự nhận ra và gợi ý lưu thành phiên bản mới.
        </p>
        {candidates.length > 0 && (
          <button type="button" disabled={disabled} className={linkButton} onClick={() => onChange({ ...value, mode: "version" })}>
            <Layers aria-hidden="true" className="size-3.5" />
            Thêm phiên bản cho hợp đồng đã có
          </button>
        )}
      </div>
    );
  }

  return (
    <section aria-label="Hợp đồng nhận phiên bản mới" className="mb-4 rounded-lg border border-blue-200 bg-blue-50/60 p-3.5">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-ui font-semibold text-[#1f2d44]">Tải phiên bản mới cho hợp đồng đã có</p>
        <button
          type="button"
          disabled={disabled}
          className={linkButton}
          onClick={() => onChange({ mode: "new", contractId: "", note: "", contract: undefined })}
        >
          <X aria-hidden="true" className="size-3.5" />
          Tải hợp đồng mới thay vào đó
        </button>
      </div>
      {selected ? (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[#e4e8ef] bg-white px-3.5 py-3">
          <div className="min-w-0 space-y-2">
            <p className="m-0 text-ui font-semibold [overflow-wrap:anywhere]">{selected.title}</p>
            <VersionPath current={selected.versionNumber} next={selected.versionNumber + 1} />
          </div>
          <button type="button" disabled={disabled} className={linkButton} onClick={() => onChange({ ...value, contractId: "", contract: undefined })}>
            Đổi hợp đồng
          </button>
        </div>
      ) : (
        <ContractSearchPicker value={null} disabled={disabled} onSelect={(contract) => onChange({ ...value, contractId: contract.id, contract })} />
      )}
      <label className="mt-3 grid gap-1.5 text-ui">
        <span className="font-medium text-[#1f3150]">
          Ghi chú cho phiên bản {selected ? selected.versionNumber + 1 : "mới"} <span className="font-normal text-[color:var(--muted)]">(không bắt buộc)</span>
        </span>
        <input
          className="h-10 rounded-lg border border-[color:var(--line)] bg-white px-3 text-ui"
          maxLength={300}
          disabled={disabled}
          placeholder="Ví dụ: Bản sau đàm phán lần 2"
          value={value.note}
          onChange={(event) => onChange({ ...value, note: event.target.value })}
        />
      </label>
    </section>
  );
}
