"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";

export function QuickContractUpload({ onSelect }: { onSelect: (file: File) => void }) {
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  function select(files: FileList | null) {
    setError("");
    if (!files?.length) return;
    if (files.length > 1) { setError("Hãy chọn một hợp đồng mỗi lần để kiểm tra thông tin trước khi tải lên."); return; }
    onSelect(files[0]);
  }
  return <section className={`min-w-[0] [border:1px_dashed_#e1e8f2] rounded-[18px] [background:linear-gradient(110deg,_#f3f7ff,_#fff)] p-[24px] shadow-[0_18px_35px_-34px_#4b668b] [transition:border-color_.15s_ease,_background_.15s_ease,_box-shadow_.15s_ease] [&_h2]:m-[0] [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:tracking-[-.02em] [&_>_p]:mt-[7px]! [&_>_p]:text-[#708099] [&_>_p]:text-[13px] [&_>_p]:leading-[1.6] [&_label]:inline-flex [&_label]:min-h-[42px] [&_label]:items-center [&_label]:gap-[9px] [&_label]:mt-[16px] [&_label]:p-[9px_16px] [&_label]:[border:1px_solid_#c9d8ef] [&_label]:rounded-[10px] [&_label]:[background:#fff] [&_label]:text-[#245bd6] [&_label]:text-[13px] [&_label]:font-bold [&_label]:cursor-pointer [&_label_svg]:w-[18px] [&_label_svg]:h-[18px] [&_input]:absolute [&_input]:w-[1px] [&_input]:h-[1px] [&_input]:overflow-hidden [&_input]:[clip-path:inset(50%)] [&_label:focus-within]:[outline:3px_solid_#9bbcf8] [&_label:focus-within]:[outline-offset:3px] max-[650px]:p-[20px] [&.tw-member-insights-dragging]:[border:2px_dashed_#2864dc] [&.tw-member-insights-dragging]:[background:#eaf2ff] [&.tw-member-insights-dragging]:shadow-[inset_0_0_0_4px_#dce9ff] motion-reduce:[transition:none] ${dragging ? "tw-member-insights-dragging" : ""}`}
    onDragEnter={(event) => { event.preventDefault(); if (!event.dataTransfer.types.includes("Files")) return; depth.current += 1; setDragging(true); }}
    onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
    onDragLeave={(event) => { event.preventDefault(); depth.current = Math.max(0, depth.current - 1); if (!depth.current) setDragging(false); }}
    onDrop={(event) => { event.preventDefault(); depth.current = 0; setDragging(false); select(event.dataTransfer.files); }}>
    <div className={"flex gap-[13px] items-start [&_>_span]:grid [&_>_span]:w-[42px] [&_>_span]:h-[42px] [&_>_span]:flex-none [&_>_span]:place-items-center [&_>_span]:rounded-[12px] [&_>_span]:[background:#eaf2ff] [&_>_span]:text-[#245bd6] [&_svg]:w-[20px] [&_svg]:h-[20px] [&_p]:mt-[0] [&_p]:text-[#65748b] [&_p]:text-[13px] [&_p]:leading-[1.6]"}><span><Icon name="upload" /></span><div><h2>{dragging ? "Thả tài liệu để tiếp tục" : "Tải hợp đồng nhanh"}</h2><p>Chọn hoặc kéo thả một tệp. Kiểm tra thông tin trước khi xác nhận tải lên.</p></div></div>
    <label><Icon name="document" />Chọn tài liệu<input type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" onChange={(event) => { select(event.target.files); event.target.value = ""; }} /></label>
    <p>PDF, DOCX, PNG, JPG · Tối đa 20 MB</p>
    {error && <p className={"text-[#a23a4d] text-[13px] leading-[1.7]"} role="alert">{error}</p>}
  </section>;
}
