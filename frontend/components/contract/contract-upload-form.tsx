"use client";

import { useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { Icon } from "@/components/ui/icon";
import type { DashboardContract } from "@/types/contracts";

type ContractUploadFormProps = {
  file: File | null;
  title: string;
  contractType: DashboardContract["type"];
  typeLabels: Record<DashboardContract["type"], string>;
  isUploading: boolean;
  onFileChange: (file?: File) => void;
  onTitleChange: (title: string) => void;
  onContractTypeChange: (type: DashboardContract["type"]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ContractUploadForm({ file, title, contractType, typeLabels, isUploading, onFileChange, onTitleChange, onContractTypeChange, onSubmit }: ContractUploadFormProps) {
  const [isDragging, setIsDragging] = useState(false);

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    onFileChange(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    onFileChange(event.dataTransfer.files?.[0]);
  }

  return (
    <form className="p-5 [@media_(max-width:_580px)]:p-[15px]" onSubmit={onSubmit}>
      <label className={`min-h-[146px] flex items-center justify-center gap-3.5 cursor-pointer p-[22px] rounded-xl border-[1.5px] border-dashed border-[#b9c8dc] [background:#fafcff] hover:border-[color:var(--accent)] hover:[background:#f2f7ff] [@media_(max-width:_580px)]:min-h-[135px] [@media_(max-width:_580px)]:flex-col [@media_(max-width:_580px)]:text-center ${isDragging ? "border-[color:var(--accent)] [background:#f2f7ff]" : ""} ${file ? "[background:#f5fbf9] border-[#78ad9b]" : ""}`} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
        <input type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" onChange={handleFileInput} className="absolute w-px h-px opacity-0" />
        <span className="w-12 h-12 grid place-items-center flex-none text-[#23745e] [background:#e2f3ed] rounded-[13px] [&_svg]:w-[22px]"><Icon name={file ? "check" : "upload"} /></span>
        <span className="[&>*]:block"><strong className="text-[length:13px] [overflow-wrap:anywhere]">{file ? file.name : "Thả hợp đồng vào đây"}</strong><small className="text-[color:var(--muted)] text-[length:10px] mt-[5px]">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · Nhấn để chọn tệp khác` : "hoặc nhấn để chọn tệp từ máy tính"}</small></span>
      </label>
      <div className="grid grid-cols-[1.25fr_0.75fr] gap-3.5 mt-4 [@media_(max-width:_580px)]:grid-cols-[1fr] [&_label_>_span]:block [&_label_>_span]:text-[#34435a] [&_label_>_span]:text-[length:10px] [&_label_>_span]:font-bold [&_label_>_span]:mb-[7px] [&_input]:w-full [&_select]:w-full [&_input]:h-[42px] [&_select]:h-[42px] [&_input]:px-3 [&_select]:px-3 [&_input]:border [&_select]:border [&_input]:border-[#d8e0ea] [&_select]:border-[#d8e0ea] [&_input]:rounded-[9px] [&_select]:rounded-[9px] [&_input]:[background:white] [&_select]:[background:white] [&_input]:text-[length:11px] [&_select]:text-[length:11px]">
        <label><span>Tên hợp đồng</span><input value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="Ví dụ: Hợp đồng dịch vụ ABC" maxLength={300} /></label>
        <label><span>Loại hợp đồng</span><select value={contractType} onChange={(event) => onContractTypeChange(event.target.value as DashboardContract["type"])}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <div className="flex justify-end [border-top:1px_solid_#edf0f4] mt-[18px] pt-[17px]">
        <button className="min-h-[43px] inline-flex items-center justify-center gap-3 text-white [background:var(--accent)] text-[length:11px] font-bold px-4 rounded-[9px] border-0 cursor-pointer hover:[background:var(--accent-dark)] disabled:opacity-50 disabled:cursor-not-allowed [@media_(max-width:_580px)]:w-full" type="submit" disabled={!file || title.trim().length < 2 || isUploading}>{isUploading ? "Đang tải lên..." : "Tải hợp đồng lên"}<Icon name="arrow" /></button>
      </div>
    </form>
  );
}
