"use client";

import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useUpdateLegalSourceMutation } from "@/hooks/legal-sources/use-legal-sources";
import { prepareLegalSourceUpdate } from "@/schemas/legal-source.schema";
import type { LegalSource } from "@/types/legal-sources";

export function useLegalSourceEdit(source: LegalSource, onSaved: () => void) {
  const mutation = useUpdateLegalSourceMutation(source._id);
  const [error, setError] = useState("");
  const lock = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setError("");
    try {
      await mutation.mutateAsync(prepareLegalSourceUpdate(event.currentTarget, source));
      toast.success("Đã cập nhật nguồn pháp lý.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật nguồn pháp lý.");
    } finally { lock.current = false; }
  }

  return { submit, error, pending: mutation.isPending, clearError: () => setError("") };
}
