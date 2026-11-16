"use client";

import Link from "next/link";
import { useMemo, useState, type ChangeEvent, type DragEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { useContract } from "@/hooks/contracts/use-contracts";
import type { UploadTarget } from "@/hooks/review/use-review-workflow";
import {
  UploadTargetPicker,
  type UploadTargetState,
  type VersionCandidate,
} from "@/components/review/upload/upload-target-picker";

type ContractUploadFormProps = {
  file: File | null;
  title?: string;
  supportedTypes?: string[];
  isUploading: boolean;
  isReviewing?: boolean;
  isLoadingResult?: boolean;
  versionCandidates?: VersionCandidate[];
  activeHref?: string;
  onFileChange: (file?: File, target?: UploadTarget) => void;
};

const objectIdPattern = /^[a-f\d]{24}$/i;

export function ContractUploadForm({ file, title, supportedTypes = [], isUploading, isReviewing = false, isLoadingResult = false, versionCandidates, activeHref, onFileChange }: ContractUploadFormProps) {
  const [isDragging, setIsDragging] = useState(false);
  const requestedVersionOf = useSearchParams().get("versionOf") ?? "";
  const versionOfId = objectIdPattern.test(requestedVersionOf) ? requestedVersionOf : "";
  const [target, setTarget] = useState<UploadTargetState>({
    mode: versionOfId ? "version" : "new",
    contractId: versionOfId,
    note: "",
  });
  const requestedContract = useContract(
    versionOfId && !versionCandidates?.some((candidate) => candidate.id === versionOfId) ? versionOfId : "",
  );
  const candidates = useMemo(() => {
    const list = versionCandidates ?? [];
    const extra = requestedContract.data;
    const extraId = extra?.id ?? extra?._id;
    if (!extra || !extraId || list.some((candidate) => candidate.id === extraId)) return list;
    return [{ id: extraId, title: extra.title, versionNumber: extra.currentVersion?.versionNumber }, ...list];
  }, [versionCandidates, requestedContract.data]);
  const versionMode = target.mode === "version";
  const selectedContract = target.contract ?? candidates.find((candidate) => candidate.id === target.contractId);
  const awaitingContract = versionMode && !selectedContract;
  const locked = isUploading || isReviewing || isLoadingResult;
  const dropDisabled = locked || awaitingContract;

  function submit(nextFile?: File) {
    if (dropDisabled || !nextFile) return;
    onFileChange(
      nextFile,
      versionMode && selectedContract
        ? { versionOf: { id: selectedContract.id, title: selectedContract.title }, note: target.note }
        : undefined,
    );
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    submit(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    submit(event.dataTransfer.files?.[0]);
  }

  const idleHeading = versionMode ? "Chọn tệp phiên bản mới" : "Chọn tệp hợp đồng để tải lên";
  const idleHint = awaitingContract
    ? "Chọn hợp đồng cần thêm phiên bản trước."
    : versionMode
      ? `Tệp sẽ được lưu thành phiên bản ${(selectedContract?.versionNumber ?? 0) + 1} của “${selectedContract?.title}”.`
      : "Kéo và thả tệp vào đây hoặc nhấn để chọn từ máy tính. Tệp sẽ được tải lên ngay.";

  return (
    <div aria-busy={locked || undefined} className="p-5 [&_input:disabled]:cursor-not-allowed [&_select:disabled]:cursor-not-allowed [@media_(max-width:_580px)]:p-[15px]">
      {(isReviewing || isLoadingResult) && <div role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-ui leading-6 text-blue-900">
        <Icon name="lock" className="mt-1 size-4 shrink-0" />
        <div className="min-w-0"><p className="m-0 font-semibold">{isLoadingResult ? "Đang tải kết quả hợp đồng hiện tại" : "Đang rà soát hợp đồng hiện tại"}</p>
          {title && <p className="m-0 mt-1 break-words [overflow-wrap:anywhere]">{title}</p>}
          <p className="mb-0 mt-1 text-ui-meta">Bạn có thể tải hợp đồng khác sau khi quá trình này kết thúc.</p>
          {activeHref && <Link href={activeHref} className="mt-2 inline-block text-ui-meta font-semibold text-blue-800 underline-offset-4 hover:underline">Xem tiến trình rà soát</Link>}
        </div>
      </div>}
      {versionCandidates && (
        <UploadTargetPicker value={target} candidates={candidates} disabled={locked} onChange={setTarget} />
      )}
      <label className={`min-h-[146px] flex items-center justify-center gap-3.5 p-[22px] rounded-xl border-[1.5px] border-dashed border-[#b9c8dc] [background:#fafcff] [@media_(max-width:_580px)]:min-h-[135px] [@media_(max-width:_580px)]:flex-col [@media_(max-width:_580px)]:text-center ${dropDisabled ? "cursor-not-allowed" : "cursor-pointer hover:border-[color:var(--accent)] hover:[background:#f2f7ff]"} ${isDragging && !dropDisabled ? "border-[color:var(--accent)] [background:#f2f7ff]" : ""} ${file ? "[background:#f5fbf9] border-[#78ad9b]" : ""}`} onDragOver={(event) => { event.preventDefault(); if (!dropDisabled) setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
        <input type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" onChange={handleFileInput} disabled={dropDisabled} className="absolute w-px h-px opacity-0" />
        <span className="w-12 h-12 grid place-items-center flex-none text-[#23745e] [background:#e2f3ed] rounded-[13px] [&_svg]:w-[22px]"><Icon name={isReviewing || isLoadingResult ? "lock" : file ? "check" : "upload"} /></span>
        <span className="[&>*]:block"><strong className="text-[length:13px] [overflow-wrap:anywhere]">{isUploading ? "Đang tải tệp hợp đồng lên…" : isLoadingResult ? "Đang tải kết quả…" : isReviewing ? "Đang rà soát hợp đồng hiện tại" : file ? file.name : idleHeading}</strong><small className="text-[color:var(--muted)] text-ui mt-[5px]">{locked ? "Tạm thời không thể chọn tệp khác." : file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · Nhấn để tải lại hoặc chọn tệp khác` : idleHint}</small></span>
      </label>
      {supportedTypes.length > 0 && <p className="mb-0 mt-3 text-ui-meta leading-5 text-[color:var(--muted)]">AI sẽ tự nhận diện loại hợp đồng và vai trò của bạn. Hiện hỗ trợ: {supportedTypes.join(" · ")}.</p>}
    </div>
  );
}
