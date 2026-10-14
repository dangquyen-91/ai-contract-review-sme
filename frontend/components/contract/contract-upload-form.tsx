"use client";

import { useState, type ChangeEvent, type DragEvent } from "react";
import { Icon } from "@/components/ui/icon";
import type { ContractProfile } from "@/types/contracts";

type ContractUploadFormProps = {
  file: File | null;
  title: string;
  contractType: string;
  typeLabels: Record<string, string>;
  profile?: ContractProfile;
  ourParty: string;
  fixedOurParty?: string;
  industry: string;
  isUploading: boolean;
  isReviewing?: boolean;
  isLoadingResult?: boolean;
  onFileChange: (file?: File) => void;
  onTitleChange: (title: string) => void;
  onContractTypeChange: (type: string) => void;
  onOurPartyChange: (party: string) => void;
  onIndustryChange: (industry: string) => void;
};

export function ContractUploadForm({ file, title, contractType, typeLabels, profile, ourParty, fixedOurParty, industry, isUploading, isReviewing = false, isLoadingResult = false, onFileChange, onTitleChange, onContractTypeChange, onOurPartyChange, onIndustryChange }: ContractUploadFormProps) {
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
      <div className="grid grid-cols-[1.25fr_0.75fr] gap-3.5 mb-4 [@media_(max-width:_580px)]:grid-cols-[1fr] [&_label_>_span]:block [&_label_>_span]:text-[#34435a] [&_label_>_span]:text-ui [&_label_>_span]:font-bold [&_label_>_span]:mb-[7px] [&_input]:w-full [&_select]:w-full [&_input]:h-[46px] [&_select]:h-[46px] [&_input]:px-3 [&_select]:pl-3 [&_input]:border [&_select]:border [&_input]:border-[#d8e0ea] [&_select]:border-[#d8e0ea] [&_input]:rounded-[9px] [&_select]:rounded-[9px] [&_input]:[background:white] [&_select]:bg-white [&_input]:text-ui [&_select]:text-ui">
        <label><span>Tên hợp đồng (không bắt buộc)</span><input value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="Để trống để dùng tên tệp" maxLength={300} disabled={locked} /></label>
        <label className="relative block after:pointer-events-none after:absolute after:right-[18px] after:bottom-[20px] after:h-2 after:w-2 after:rotate-45 after:border-r-[1.7px] after:border-b-[1.7px] after:border-[#14213d]"><span>Loại hợp đồng</span><select className="appearance-none pr-[42px] disabled:cursor-not-allowed" value={contractType} onChange={(event) => onContractTypeChange(event.target.value)} disabled={locked}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      {profile && <div className="mb-4 grid grid-cols-2 gap-3.5 [@media_(max-width:_580px)]:grid-cols-1 [&_label_>_span]:mb-[7px] [&_label_>_span]:block [&_label_>_span]:text-ui [&_label_>_span]:font-bold [&_label_>_span]:text-[#34435a] [&_select]:h-[46px] [&_select]:w-full [&_select]:rounded-[9px] [&_select]:border [&_select]:border-[#d8e0ea] [&_select]:bg-white [&_select]:pl-3 [&_select]:text-ui-document">
        <label className="relative block after:pointer-events-none after:absolute after:right-[18px] after:bottom-[20px] after:h-2 after:w-2 after:rotate-45 after:border-r-[1.7px] after:border-b-[1.7px] after:border-[#14213d]"><span>Đối tượng sử dụng</span><select className="appearance-none pr-[42px] disabled:cursor-not-allowed" value={fixedOurParty ?? ourParty} onChange={(event) => onOurPartyChange(event.target.value)} disabled={locked || Boolean(fixedOurParty)}>{!fixedOurParty && <option value="">Chưa xác định</option>}{profile.parties.filter((party) => !fixedOurParty || party.code === fixedOurParty).map((party) => <option key={party.code} value={party.code}>{party.name}</option>)}</select></label>
        <label className="relative block after:pointer-events-none after:absolute after:right-[18px] after:bottom-[20px] after:h-2 after:w-2 after:rotate-45 after:border-r-[1.7px] after:border-b-[1.7px] after:border-[#14213d]"><span>Ngành kinh doanh</span><select className="appearance-none pr-[42px] disabled:cursor-not-allowed" value={industry} onChange={(event) => onIndustryChange(event.target.value)} disabled={locked}><option value="">Không chọn</option>{profile.industries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
      </div>}
      <label className={`min-h-[146px] flex items-center justify-center gap-3.5 p-[22px] rounded-xl border-[1.5px] border-dashed border-[#b9c8dc] [background:#fafcff] [@media_(max-width:_580px)]:min-h-[135px] [@media_(max-width:_580px)]:flex-col [@media_(max-width:_580px)]:text-center ${locked ? "cursor-not-allowed" : "cursor-pointer hover:border-[color:var(--accent)] hover:[background:#f2f7ff]"} ${isDragging && !locked ? "border-[color:var(--accent)] [background:#f2f7ff]" : ""} ${file ? "[background:#f5fbf9] border-[#78ad9b]" : ""}`} onDragOver={(event) => { event.preventDefault(); if (!locked) setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
        <input type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" onChange={handleFileInput} disabled={locked} className="absolute w-px h-px opacity-0" />
        <span className="w-12 h-12 grid place-items-center flex-none text-[#23745e] [background:#e2f3ed] rounded-[13px] [&_svg]:w-[22px]"><Icon name={isReviewing || isLoadingResult ? "lock" : file ? "check" : "upload"} /></span>
        <span className="[&>*]:block"><strong className="text-[length:13px] [overflow-wrap:anywhere]">{isUploading ? "Đang tải tệp hợp đồng lên…" : isLoadingResult ? "Đang tải kết quả…" : isReviewing ? "Đang rà soát hợp đồng hiện tại" : file ? file.name : "Chọn tệp hợp đồng để tải lên"}</strong><small className="text-[color:var(--muted)] text-ui mt-[5px]">{locked ? "Tạm thời không thể chọn tệp khác." : file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · Nhấn để tải lại hoặc chọn tệp khác` : "Kéo và thả tệp vào đây hoặc nhấn để chọn từ máy tính. Tệp sẽ được tải lên ngay."}</small></span>
      </label>
    </div>
  );
}
