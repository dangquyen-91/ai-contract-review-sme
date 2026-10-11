"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import styles from "./member-insights.module.css";

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
  return <section className={`${styles.quickUpload} ${dragging ? styles.dragging : ""}`}
    onDragEnter={(event) => { event.preventDefault(); if (!event.dataTransfer.types.includes("Files")) return; depth.current += 1; setDragging(true); }}
    onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
    onDragLeave={(event) => { event.preventDefault(); depth.current = Math.max(0, depth.current - 1); if (!depth.current) setDragging(false); }}
    onDrop={(event) => { event.preventDefault(); depth.current = 0; setDragging(false); select(event.dataTransfer.files); }}>
    <div className={styles.uploadHeading}><span><Icon name="upload" /></span><div><h2>{dragging ? "Thả tài liệu để tiếp tục" : "Tải hợp đồng nhanh"}</h2><p>Chọn hoặc kéo thả một tệp. Kiểm tra thông tin trước khi xác nhận tải lên.</p></div></div>
    <label><Icon name="document" />Chọn tài liệu<input type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" onChange={(event) => { select(event.target.files); event.target.value = ""; }} /></label>
    <p>PDF, DOCX, PNG, JPG · Tối đa 20 MB</p>
    {error && <p className={styles.error} role="alert">{error}</p>}
  </section>;
}
