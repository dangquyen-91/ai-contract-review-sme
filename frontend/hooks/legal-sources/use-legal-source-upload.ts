"use client";

import { useRef, useState, type FormEvent } from "react";
import { usePreviewLegalSourceMutation } from "@/hooks/legal-sources/use-legal-sources";
import { prepareLegalUpload } from "@/schemas/legal-source.schema";
import type { LegalSource, LegalSourcePreview } from "@/types/legal-sources";

export function useLegalSourceUpload(metadata: boolean, save: (body: FormData) => Promise<LegalSource>, onSaved: (source: LegalSource) => void) {
  const previewMutation = usePreviewLegalSourceMutation();
  const [preview, setPreview] = useState<LegalSourcePreview | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const snapshot = useRef<FormData | null>(null);
  function reset() { snapshot.current = null; setPreview(null); setError(""); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true; setPending(true); setError("");
    try {
      if (snapshot.current && preview) {
        const source = await save(snapshot.current);
        onSaved(source);
      } else {
        const body = prepareLegalUpload(event.currentTarget, metadata);
        const request = new FormData();
        request.set("file", body.get("file")!);
        if (body.has("expectedArticleCount")) request.set("expectedArticleCount", body.get("expectedArticleCount")!);
        const result = await previewMutation.mutateAsync(request);
        snapshot.current = body;
        setPreview(result);
      }
    } catch (err) {
      setError(`${err instanceof Error ? err.message : "Không thể xử lý tài liệu."} Nếu yêu cầu lưu bị gián đoạn, hãy cập nhật danh sách hoặc chi tiết trước khi gửi lại.`);
    } finally { lock.current = false; setPending(false); }
  }
  return { preview, error, pending, reset, submit };
}
