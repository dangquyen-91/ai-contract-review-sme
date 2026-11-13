"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ContractSearchPicker, VersionPath, type PickedContract } from "./contract-search-picker";

export type VersionCandidate = { id: string; title: string; versionNumber?: number };

export type UploadTargetState = {
  mode: "new" | "version";
  contractId: string;
  note: string;
  contract?: PickedContract;
};

function ModeOption({ value, checked, disabled, title, detail }: {
  value: UploadTargetState["mode"];
  checked: boolean;
  disabled?: boolean;
  title: string;
  detail: string;
}) {
  return (
    <label
      className={`flex flex-1 items-start gap-2.5 rounded-lg border px-3 py-2.5 text-ui leading-5 transition-colors ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      } ${checked ? "border-primary bg-accent/60" : "border-border bg-card hover:bg-muted/40"}`}
    >
      <RadioGroupItem value={value} disabled={disabled} className="mt-0.5" />
      <span>
        <strong className="block font-semibold">{title}</strong>
        <small className="text-ui-meta text-muted-foreground">{detail}</small>
      </span>
    </label>
  );
}

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
  const versionMode = value.mode === "version";
  const listed = candidates.find((candidate) => candidate.id === value.contractId);
  const selected: PickedContract | null = value.contract
    ?? (listed ? { id: listed.id, title: listed.title, versionNumber: listed.versionNumber ?? 1 } : null);

  return (
    <fieldset className="m-0 mb-4 border-0 p-0" disabled={disabled}>
      <legend className="mb-2 p-0 text-ui font-semibold text-foreground">Bạn đang tải lên</legend>
      <RadioGroup
        value={value.mode}
        onValueChange={(mode) => onChange({ ...value, mode: mode as UploadTargetState["mode"] })}
        disabled={disabled}
        className="flex gap-2.5 max-[580px]:flex-col"
      >
        <ModeOption value="new" checked={!versionMode} title="Hợp đồng mới" detail="Một hợp đồng chưa có trong danh sách" />
        <ModeOption
          value="version"
          checked={versionMode}
          disabled={candidates.length === 0}
          title="Phiên bản mới của hợp đồng đã có"
          detail="Bản đối tác gửi lại hoặc bản sau đàm phán"
        />
      </RadioGroup>
      {versionMode && (
        <div className="mt-3 grid gap-3">
          {selected ? (
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3.5 py-3">
              <div className="min-w-0 space-y-2">
                <p className="m-0 text-ui font-semibold [overflow-wrap:anywhere]">{selected.title}</p>
                <VersionPath current={selected.versionNumber} next={selected.versionNumber + 1} />
              </div>
              <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={() => onChange({ ...value, contractId: "", contract: undefined })}>
                Đổi hợp đồng
              </Button>
            </div>
          ) : (
            <ContractSearchPicker
              value={null}
              disabled={disabled}
              onSelect={(contract) => onChange({ ...value, contractId: contract.id, contract })}
            />
          )}
          <label className="grid gap-1.5 text-ui">
            <span className="font-medium text-foreground">
              Ghi chú phiên bản <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
            </span>
            <Input
              maxLength={300}
              placeholder="Ví dụ: Bản sau đàm phán lần 2"
              value={value.note}
              onChange={(event) => onChange({ ...value, note: event.target.value })}
            />
          </label>
        </div>
      )}
    </fieldset>
  );
}
