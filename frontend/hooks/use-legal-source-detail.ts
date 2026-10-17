"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useLegalSource, useRemoveLegalSourceMutation, useResumeLegalSourceMutation } from "@/hooks/use-legal-sources";

export function useLegalSourceDetail(id: string, onDeleted: () => void) {
  const query = useLegalSource(id);
  const resume = useResumeLegalSourceMutation(id);
  const remove = useRemoveLegalSourceMutation();
  const [append, setAppend] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const busy = resume.isPending || remove.isPending;

  async function resumeSource() {
    if (lock.current || busy || append || deleting) return;
    lock.current = true;
    setError("");
    try { await resume.mutateAsync(); toast.success("Đã tiếp nhận yêu cầu tiếp tục xử lý."); }
    catch (err) { setError(err instanceof Error ? err.message : "Không thể tiếp tục xử lý."); }
    finally { lock.current = false; }
  }

  async function deleteSource() {
    if (lock.current || busy || !deleting) return;
    lock.current = true;
    setError("");
    try { await remove.mutateAsync(id); toast.success("Đã xóa nguồn pháp lý."); onDeleted(); }
    catch (err) { setError(err instanceof Error ? err.message : "Không thể xóa nguồn."); }
    finally { lock.current = false; }
  }

  return {
    query, source: query.data, busy, append, deleting, error,
    resumePending: resume.isPending, deletePending: remove.isPending,
    resumeSource, deleteSource,
    openAppend: () => { if (!busy && !lock.current && !deleting) setAppend(true); },
    closeAppend: () => setAppend(false),
    openDeletion: () => { if (!busy && !lock.current && !append) { setError(""); setDeleting(true); } },
    cancelDeletion: () => { if (!busy && !lock.current) { setDeleting(false); setError(""); } },
  };
}

export type LegalSourceDetailWorkflow = ReturnType<typeof useLegalSourceDetail>;
