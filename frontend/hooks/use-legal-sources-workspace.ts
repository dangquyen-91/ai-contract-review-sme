"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useLegalSources, useRemoveLegalSourceMutation } from "@/hooks/use-legal-sources";
import { usePaginationPage } from "@/hooks/use-pagination-page";
import type { LegalSource } from "@/types/legal-sources";

export function useLegalSourcesWorkspace() {
  const query = useLegalSources();
  const removeMutation = useRemoveLegalSourceMutation();
  const lock = useRef(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [page, setPage] = usePaginationPage();
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<LegalSource | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const filtered = (query.data ?? []).filter((source) =>
    (type === "all" || source.sourceType === type) &&
    `${source.title} ${source.citationLabel} ${source.issuingBody ?? ""}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, totalPages);
  const sources = filtered.slice((currentPage - 1) * 10, currentPage * 10);

  async function removeSource() {
    if (!deleting || removeMutation.isPending || lock.current) return;
    lock.current = true;
    setDeleteError("");
    try {
      await removeMutation.mutateAsync(deleting._id);
      setDeleting(null);
      toast.success("Đã xóa nguồn pháp lý");
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Không thể xóa nguồn pháp lý.");
    } finally { lock.current = false; }
  }

  return {
    query, search, type, filtered, sources, currentPage, totalPages, showForm, deleting, deleteError,
    deletePending: removeMutation.isPending,
    setPage,
    changeSearch: (value: string) => { setSearch(value); setPage(1); },
    changeType: (value: string) => { setType(value); setPage(1); },
    openForm: () => setShowForm(true),
    closeForm: () => setShowForm(false),
    selectForDeletion: (source: LegalSource) => { if (!removeMutation.isPending && !lock.current) { setDeleting(source); setDeleteError(""); } },
    cancelDeletion: () => { if (!removeMutation.isPending && !lock.current) setDeleting(null); },
    removeSource,
    sourceSaved: () => {
      setShowForm(false); setSearch(""); setType("all"); setPage(1);
      toast.success("Đã thêm nguồn pháp lý");
    },
  };
}
