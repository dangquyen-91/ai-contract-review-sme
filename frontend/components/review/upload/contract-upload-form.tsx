"use client";

import { useState, type ChangeEvent, type DragEvent } from "react";
import { Icon } from "@/components/ui/icon";

type ContractUploadFormProps = {
  file: File | null;
  title?: string;
  supportedTypes?: string[];
  isUploading: boolean;
  isReviewing?: boolean;
  isLoadingResult?: boolean;
  onFileChange: (file?: File) => void;
};

export function ContractUploadForm({ file, title, supportedTypes = [], isUploading, isReviewing = false, isLoadingResult = false, onFileChange }: ContractUploadFormProps) {
  const [isDragging, setIsDragging] = useState(false);
  const locked = isUploading || isReviewing || isLoadingResult;

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    if (!locked) onFileChange(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (!locked) onFileChange(event.dataTransfer.files?.[0]);
  }

  return (
    <div aria-busy={locked || undefined} className="p-5 [&_input:disabled]:cursor-not-allowed [&_select:disabled]:cursor-not-allowed [@media_(max-width:_580px)]:p-[15px]">
      {(isReviewing || isLoadingResult) && <div role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-ui leading-6 text-blue-900">
        <Icon name="lock" className="mt-1 size-4 shrink-0" />
        <div className="min-w-0"><p className="m-0 font-semibold">{isLoadingResult ? "Đang tải kết quả hợp đồng hiện tại" : "Đang rà soát hợp đồng hiện tại"}</p>
          {title && <p className="m-0 mt-1 break-words [overflow-wrap:anywhere]">{title}</p>}
          <p className="mb-0 mt-1 text-ui-meta">Bạn có thể tải hợp đồng khác sau khi quá trình này kết thúc.</p>
        </div>
      </div>}
      <label className={`min-h-[146px] flex items-center justify-center gap-3.5 p-[22px] rounded-xl border-[1.5px] border-dashed border-[#b9c8dc] [background:#fafcff] [@media_(max-width:_580px)]:min-h-[135px] [@media_(max-width:_580px)]:flex-col [@media_(max-width:_580px)]:text-center ${locked ? "cursor-not-allowed" : "cursor-pointer hover:border-[color:var(--accent)] hover:[background:#f2f7ff]"} ${isDragging && !locked ? "border-[color:var(--accent)] [background:#f2f7ff]" : ""} ${file ? "[background:#f5fbf9] border-[#78ad9b]" : ""}`} onDragOver={(event) => { event.preventDefault(); if (!locked) setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
        <input type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" onChange={handleFileInput} disabled={locked} className="absolute w-px h-px opacity-0" />
        <span className="w-12 h-12 grid place-items-center flex-none text-[#23745e] [background:#e2f3ed] rounded-[13px] [&_svg]:w-[22px]"><Icon name={isReviewing || isLoadingResult ? "lock" : file ? "check" : "upload"} /></span>
        <span className="[&>*]:block"><strong className="text-[length:13px] [overflow-wrap:anywhere]">{isUploading ? "Đang tải tệp hợp đồng lên…" : isLoadingResult ? "Đang tải kết quả…" : isReviewing ? "Đang rà soát hợp đồng hiện tại" : file ? file.name : "Chọn tệp hợp đồng để tải lên"}</strong><small className="text-[color:var(--muted)] text-ui mt-[5px]">{locked ? "Tạm thời không thể chọn tệp khác." : file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · Nhấn để tải lại hoặc chọn tệp khác` : "Kéo và thả tệp vào đây hoặc nhấn để chọn từ máy tính. Tệp sẽ được tải lên ngay."}</small></span>
      </label>
      {supportedTypes.length > 0 && <p className="mb-0 mt-3 text-ui-meta leading-5 text-[color:var(--muted)]">AI sẽ tự nhận diện loại hợp đồng và vai trò của bạn. Hiện hỗ trợ: {supportedTypes.join(" · ")}.</p>}
    </div>
  );
}
