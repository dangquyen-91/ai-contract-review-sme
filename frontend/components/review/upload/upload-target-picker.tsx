"use client";

export type VersionCandidate = { id: string; title: string; versionNumber?: number };

export type UploadTargetState = {
  mode: "new" | "version";
  contractId: string;
  note: string;
};

const optionClass =
  "flex flex-1 cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-ui leading-5 transition-colors";

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
  return (
    <fieldset className="m-0 mb-4 border-0 p-0" disabled={disabled}>
      <legend className="mb-2 p-0 text-ui font-semibold text-[#1f3150]">Bạn đang tải lên</legend>
      <div className="flex gap-2.5 [@media_(max-width:_580px)]:flex-col">
        <label
          className={`${optionClass} ${
            versionMode ? "border-[color:var(--line)] bg-white" : "border-[color:var(--accent)] bg-[#f2f7ff]"
          }`}
        >
          <input
            type="radio"
            name="upload-target"
            className="mt-1"
            checked={!versionMode}
            onChange={() => onChange({ ...value, mode: "new" })}
          />
          <span>
            <strong className="block font-semibold">Hợp đồng mới</strong>
            <small className="text-ui-meta text-[color:var(--muted)]">Một hợp đồng chưa có trong danh sách</small>
          </span>
        </label>
        <label
          className={`${optionClass} ${
            versionMode ? "border-[color:var(--accent)] bg-[#f2f7ff]" : "border-[color:var(--line)] bg-white"
          } ${candidates.length === 0 ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <input
            type="radio"
            name="upload-target"
            className="mt-1"
            checked={versionMode}
            disabled={candidates.length === 0}
            onChange={() => onChange({ ...value, mode: "version", contractId: value.contractId || candidates[0]?.id || "" })}
          />
          <span>
            <strong className="block font-semibold">Phiên bản mới của hợp đồng đã có</strong>
            <small className="text-ui-meta text-[color:var(--muted)]">Bản đối tác gửi lại hoặc bản sau đàm phán</small>
          </span>
        </label>
      </div>
      {versionMode && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-ui">
            <span className="font-medium text-[#1f3150]">Hợp đồng</span>
            <select
              className="h-10 rounded-lg border border-[color:var(--line)] bg-white px-3 text-ui"
              value={value.contractId}
              onChange={(event) => onChange({ ...value, contractId: event.target.value })}
            >
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.title}
                  {candidate.versionNumber ? ` · hiện là v${candidate.versionNumber}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-ui">
            <span className="font-medium text-[#1f3150]">
              Ghi chú phiên bản <span className="font-normal text-[color:var(--muted)]">(không bắt buộc)</span>
            </span>
            <input
              className="h-10 rounded-lg border border-[color:var(--line)] bg-white px-3 text-ui"
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
